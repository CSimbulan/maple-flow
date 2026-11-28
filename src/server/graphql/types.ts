import {
  CardModel,
  ListModel,
  type BoardDoc,
  type CardDoc,
  type ListDoc,
  type UserDoc,
} from "../db/models";
import type { SchemaParts } from "./builder";
import { boardAudienceIds, canManageBoard, isOrgMember, orgOfBoard } from "./permissions";
import type { Context } from "./context";
import { defaultListColor } from "../../lib/list-colors";
import { DEFAULT_START_PAGE } from "../../lib/start-page";
import { tagsOf } from "./tags";
import { joinDatesOf } from "../db/workspace";

/**
 * Lists from before list colors existed get the default color for their place on the board,
 * saved so it stays put when they're reordered (a lazy migration, like ensureWorkspace).
 */
async function withColors(lists: ListDoc[]): Promise<ListDoc[]> {
  const missing = lists.flatMap((l, i) => (l.color ? [] : [{ l, color: defaultListColor(i) }]));
  if (missing.length === 0) return lists;
  await ListModel.bulkWrite(
    missing.map(({ l, color }) => ({
      updateOne: { filter: { _id: l._id, color: null }, update: { $set: { color } } },
    })),
  );
  return lists.map((l, i) => (l.color ? l : { ...l, color: defaultListColor(i) }));
}

/** The later of a board's own last edit and the newest activity entry on its cards. */
export async function lastActivityAt(ctx: Context, board: BoardDoc): Promise<Date> {
  const activity = await ctx.loaders.lastActivityByBoard.load(board._id.toString());
  return activity && activity > board.updatedAt ? activity : board.updatedAt;
}

/** Users by id (ObjectIds or strings), skipping any that no longer exist. */
async function loadUsers(ctx: Context, ids: { toString(): string }[]): Promise<UserDoc[]> {
  const users = await ctx.loaders.userById.loadMany(ids.map(String));
  return users.filter((u): u is UserDoc => !!u && !(u instanceof Error));
}

/** Registers the object types (User, Board, List, Card and mutation payloads) on a builder. */
export function defineTypes({
  builder,
  UserRef,
  StartPageEnum,
  WorkspaceRef,
  WorkspaceMemberRef,
  ProjectRef,
  CreateProjectPayloadRef,
  BoardRef,
  ListRef,
  CardRef,
  TagRef,
  PriorityEnum,
  MoveCardPayloadRef,
  MoveCardsPayloadRef,
  RestoreCardPayloadRef,
  RestoreListPayloadRef,
  DeleteCardPayloadRef,
  DeleteListPayloadRef,
}: SchemaParts) {
  builder.objectType(UserRef, {
    fields: (t) => ({
      id: t.id({ resolve: (u) => u._id.toString() }),
      email: t.exposeString("email"),
      name: t.exposeString("name", { nullable: true }),
      image: t.exposeString("image", { nullable: true }),
      startPage: t.field({
        type: StartPageEnum,
        nullable: true,
        description: "Where they land after signing in. Only for the viewer; null for others.",
        resolve: (u, _args, ctx) =>
          u._id.toString() === ctx.userId ? (u.startPage ?? DEFAULT_START_PAGE) : null,
      }),
    }),
  });

  builder.objectType(WorkspaceRef, {
    fields: (t) => ({
      id: t.id({ resolve: (o) => o._id.toString() }),
      name: t.exposeString("name"),
      owner: t.field({
        type: UserRef,
        resolve: async (o, _args, ctx) => (await ctx.loaders.userById.load(o.ownerId.toString()))!,
      }),
      members: t.field({
        type: [UserRef],
        resolve: (o, _args, ctx) => loadUsers(ctx, o.memberIds),
      }),
      memberships: t.field({
        type: [WorkspaceMemberRef],
        description: "Members with when they joined, in the same order as `members`.",
        resolve: async (o, _args, ctx) => {
          const dates = await joinDatesOf(o);
          const users = await ctx.loaders.userById.loadMany(dates.map((d) => d.userId.toString()));
          return dates.flatMap((d, i) => {
            const user = users[i];
            return user && !(user instanceof Error) ? [{ user, joinedAt: d.joinedAt }] : [];
          });
        },
      }),
      viewerIsOwner: t.boolean({ resolve: (o, _args, ctx) => o.ownerId.toString() === ctx.userId }),
      createdAt: t.string({ resolve: (o) => o.createdAt.toISOString() }),
      projects: t.field({
        type: [ProjectRef],
        resolve: (o, _args, ctx) => ctx.loaders.projectsByOrg.load(o._id.toString()),
      }),
    }),
  });

  builder.objectType(WorkspaceMemberRef, {
    description: "Someone in a workspace, and when they joined it.",
    fields: (t) => ({
      user: t.field({ type: UserRef, resolve: (m) => m.user }),
      joinedAt: t.string({ resolve: (m) => m.joinedAt.toISOString() }),
    }),
  });

  builder.objectType(ProjectRef, {
    fields: (t) => ({
      id: t.id({ resolve: (p) => p._id.toString() }),
      name: t.exposeString("name"),
      createdAt: t.string({ resolve: (p) => p.createdAt.toISOString() }),
      workspace: t.field({
        type: WorkspaceRef,
        resolve: async (p, _args, ctx) => (await ctx.loaders.orgById.load(p.orgId.toString()))!,
      }),
      boards: t.field({
        type: [BoardRef],
        description: "The project's boards, most recently updated first.",
        resolve: (p, _args, ctx) => ctx.loaders.boardsByProject.load(p._id.toString()),
      }),
    }),
  });

  builder.objectType(CreateProjectPayloadRef, {
    fields: (t) => ({
      project: t.field({ type: ProjectRef, resolve: (p) => p.project }),
      workspace: t.field({ type: WorkspaceRef, resolve: (p) => p.workspace }),
    }),
  });

  builder.objectType(BoardRef, {
    fields: (t) => ({
      id: t.id({ resolve: (b) => b._id.toString() }),
      title: t.exposeString("title"),
      background: t.exposeString("background"),
      owner: t.field({
        type: UserRef,
        resolve: async (b, _args, ctx) => (await ctx.loaders.userById.load(b.ownerId.toString()))!,
      }),
      project: t.field({
        type: ProjectRef,
        nullable: true,
        resolve: (b, _args, ctx) =>
          b.projectId ? ctx.loaders.projectById.load(b.projectId.toString()) : null,
      }),
      members: t.field({
        type: [UserRef],
        description: "Everyone who can open the board: workspace members plus guests.",
        resolve: async (b, _args, ctx) => loadUsers(ctx, await boardAudienceIds(ctx, b)),
      }),
      guests: t.field({
        type: [UserRef],
        description: "People added to this board directly who aren't in its workspace.",
        resolve: async (b, _args, ctx) => {
          const org = await orgOfBoard(ctx, b);
          return loadUsers(
            ctx,
            b.memberIds.filter((id) => !org || !isOrgMember(org, id.toString())),
          );
        },
      }),
      viewerCanManage: t.boolean({
        description: "Whether the viewer can delete the board and remove guests.",
        resolve: (b, _args, ctx) => (ctx.userId ? canManageBoard(ctx, b, ctx.userId) : false),
      }),
      lists: t.field({
        type: [ListRef],
        resolve: async (b, _args, ctx) =>
          withColors(await ctx.loaders.listsByBoard.load(b._id.toString())),
      }),
      updatedAt: t.string({ resolve: (b) => b.updatedAt.toISOString() }),
      lastActivityAt: t.string({
        description: "The later of the board's own last edit and the newest card activity on it.",
        resolve: async (b, _args, ctx) => (await lastActivityAt(ctx, b)).toISOString(),
      }),
      createdAt: t.string({ resolve: (b) => b.createdAt.toISOString() }),
      tags: t.field({
        type: [TagRef],
        description: "Tags that cards on this board can carry, in the order they were added.",
        resolve: (b) => tagsOf(b),
      }),
      archivedLists: t.field({
        type: [ListRef],
        description: "Archived lists on this board, most recently archived first.",
        resolve: (b) =>
          ListModel.find({ boardId: b._id, archived: true })
            .sort({ updatedAt: -1 })
            .lean<ListDoc[]>(),
      }),
      archivedCards: t.field({
        type: [CardRef],
        description: "Archived cards on this board, most recently archived first.",
        resolve: (b) =>
          CardModel.find({ boardId: b._id, archived: true })
            .sort({ updatedAt: -1 })
            .lean<CardDoc[]>(),
      }),
    }),
  });

  builder.objectType(ListRef, {
    fields: (t) => ({
      id: t.id({ resolve: (l) => l._id.toString() }),
      title: t.exposeString("title"),
      position: t.exposeString("position"),
      color: t.string({
        description: "Header color, a hex string such as #B3E5FC.",
        // Only an archived list from before colors existed has none; the board's lists backfill.
        resolve: (l) => l.color ?? defaultListColor(0),
      }),
      boardId: t.id({ resolve: (l) => l.boardId.toString() }),
      archived: t.exposeBoolean("archived"),
      cards: t.field({
        type: [CardRef],
        resolve: (l, _args, ctx) => ctx.loaders.cardsByList.load(l._id.toString()),
      }),
    }),
  });

  builder.objectType(CardRef, {
    fields: (t) => ({
      id: t.id({ resolve: (c) => c._id.toString() }),
      createdAt: t.string({ resolve: (c) => c.createdAt.toISOString() }),
      title: t.exposeString("title"),
      description: t.exposeString("description"),
      tags: t.field({
        type: [TagRef],
        description: "The card's tags, in the board's tag order.",
        resolve: async (c, _args, ctx) => {
          // Cards from before tags existed have no tagIds stored.
          const ids = new Set((c.tagIds ?? []).map(String));
          if (ids.size === 0) return [];
          const board = await ctx.loaders.boardById.load(c.boardId.toString());
          return board ? (await tagsOf(board)).filter((tag) => ids.has(tag._id.toString())) : [];
        },
      }),
      dueDate: t.string({ nullable: true, resolve: (c) => c.dueDate?.toISOString() ?? null }),
      priority: t.field({
        type: PriorityEnum,
        nullable: true,
        description: "Null when none is set.",
        resolve: (c) => c.priority ?? null,
      }),
      position: t.exposeString("position"),
      listId: t.id({ resolve: (c) => c.listId.toString() }),
      boardId: t.id({ resolve: (c) => c.boardId.toString() }),
      archived: t.exposeBoolean("archived"),
      board: t.field({
        type: BoardRef,
        resolve: async (c, _args, ctx) => (await ctx.loaders.boardById.load(c.boardId.toString()))!,
      }),
      /** The card's list, which may itself be archived. */
      list: t.field({
        type: ListRef,
        resolve: async (c, _args, ctx) => (await ctx.loaders.listById.load(c.listId.toString()))!,
      }),
      assignees: t.field({
        type: [UserRef],
        resolve: (c, _args, ctx) => loadUsers(ctx, c.assigneeIds),
      }),
    }),
  });

  builder.objectType(TagRef, {
    fields: (t) => ({
      id: t.id({ resolve: (tag) => tag._id.toString() }),
      name: t.exposeString("name"),
      color: t.exposeString("color", { description: "Hex color; tags show white text on it." }),
    }),
  });

  builder.objectType(MoveCardsPayloadRef, {
    fields: (t) => ({
      fromList: t.field({ type: ListRef, resolve: (p) => p.fromList }),
      toList: t.field({ type: ListRef, resolve: (p) => p.toList }),
      moved: t.int({ description: "How many cards moved.", resolve: (p) => p.moved }),
    }),
  });

  builder.objectType(MoveCardPayloadRef, {
    fields: (t) => ({
      card: t.field({ type: CardRef, resolve: (p) => p.card }),
      fromList: t.field({ type: ListRef, resolve: (p) => p.fromList }),
      toList: t.field({ type: ListRef, resolve: (p) => p.toList }),
    }),
  });

  builder.objectType(RestoreCardPayloadRef, {
    fields: (t) => ({
      card: t.field({ type: CardRef, resolve: (p) => p.card }),
      list: t.field({ type: ListRef, resolve: (p) => p.list }),
      board: t.field({ type: BoardRef, resolve: (p) => p.board }),
    }),
  });

  builder.objectType(RestoreListPayloadRef, {
    fields: (t) => ({
      list: t.field({ type: ListRef, resolve: (p) => p.list }),
      board: t.field({ type: BoardRef, resolve: (p) => p.board }),
    }),
  });

  builder.objectType(DeleteCardPayloadRef, {
    fields: (t) => ({
      deletedId: t.id({ resolve: (p) => p.deletedId }),
      list: t.field({ type: ListRef, resolve: (p) => p.list }),
      board: t.field({ type: BoardRef, resolve: (p) => p.board }),
    }),
  });

  builder.objectType(DeleteListPayloadRef, {
    fields: (t) => ({
      deletedId: t.id({ resolve: (p) => p.deletedId }),
      board: t.field({ type: BoardRef, resolve: (p) => p.board }),
    }),
  });
}
