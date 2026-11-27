import type { Types } from "mongoose";
import { CardModel, ListModel, type CardDoc, type ListDoc, type UserDoc } from "../db/models";
import type { SchemaParts } from "./builder";
import type { Context } from "./context";

async function loadUsers(ctx: Context, ids: Types.ObjectId[]): Promise<UserDoc[]> {
  const users = await ctx.loaders.userById.loadMany(ids.map(String));
  return users.filter((u): u is UserDoc => !!u && !(u instanceof Error));
}

/** Registers the object types (User, Board, List, Card and mutation payloads) on a builder. */
export function defineTypes({
  builder,
  UserRef,
  BoardRef,
  ListRef,
  CardRef,
  MoveCardPayloadRef,
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
      members: t.field({
        type: [UserRef],
        resolve: (b, _args, ctx) => loadUsers(ctx, b.memberIds),
      }),
      viewerIsOwner: t.boolean({ resolve: (b, _args, ctx) => b.ownerId.toString() === ctx.userId }),
      lists: t.field({
        type: [ListRef],
        resolve: (b, _args, ctx) => ctx.loaders.listsByBoard.load(b._id.toString()),
      }),
      updatedAt: t.string({ resolve: (b) => b.updatedAt.toISOString() }),
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
      title: t.exposeString("title"),
      description: t.exposeString("description"),
      labels: t.stringList({ resolve: (c) => c.labels }),
      dueDate: t.string({ nullable: true, resolve: (c) => c.dueDate?.toISOString() ?? null }),
      position: t.exposeString("position"),
      listId: t.id({ resolve: (c) => c.listId.toString() }),
      boardId: t.id({ resolve: (c) => c.boardId.toString() }),
      archived: t.exposeBoolean("archived"),
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
