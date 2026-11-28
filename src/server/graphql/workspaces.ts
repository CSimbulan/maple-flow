import { Types } from "mongoose";
import { z } from "zod";
import { deleteProjects } from "../db/cascade";
import { PRIORITIES } from "../../lib/priority";
import {
  ActivityModel,
  BoardModel,
  CardModel,
  CommentModel,
  ListModel,
  OrganizationModel,
  ProjectModel,
  UserModel,
  type BoardDoc,
  type CardDoc,
  type ListDoc,
  type OrganizationDoc,
  type ProjectDoc,
  type UserDoc,
} from "../db/models";
import { createOrganization } from "../db/workspace";
import type { SchemaParts } from "./builder";
import type { Context } from "./context";
import { lastActivityAt } from "./types";
import { badInput, forbidden, notFound, objectId, parse } from "./errors";
import {
  isOrgMember,
  orgOfBoard,
  requireOrgMember,
  requireOrgOwner,
  requireProject,
  requireUserId,
} from "./permissions";

const name = z.string().trim().min(1, "Name can't be empty").max(100);
const email = z.email().transform((e) => e.toLowerCase());

/**
 * Every board the user can open: those in their workspaces' projects, plus boards they're a
 * guest on.
 */
async function boardsViewerCanOpen(userId: string): Promise<BoardDoc[]> {
  const orgIds = (
    await OrganizationModel.find({ memberIds: userId })
      .select({ _id: 1 })
      .lean<{ _id: Types.ObjectId }[]>()
  ).map((o) => o._id);
  const projectIds = (
    await ProjectModel.find({ orgId: { $in: orgIds } })
      .select({ _id: 1 })
      .lean<{ _id: Types.ObjectId }[]>()
  ).map((p) => p._id);
  return BoardModel.find({
    $or: [{ projectId: { $in: projectIds } }, { memberIds: userId }],
  }).lean<BoardDoc[]>();
}

const MAX_ASSIGNED_CARDS = 50;
const DAY = 24 * 60 * 60 * 1000;

// assignedCards and assignedCardCount in one request share a single lookup.
const assignedCache = new WeakMap<Context, Promise<CardDoc[]>>();

/**
 * Every active card assigned to the viewer on boards they can open, not in archived lists,
 * in assignedCards order.
 */
function assignedCardsOf(ctx: Context): Promise<CardDoc[]> {
  let cached = assignedCache.get(ctx);
  if (!cached) {
    cached = (async () => {
      const userId = requireUserId(ctx);
      const boardIds = (await boardsViewerCanOpen(userId)).map((b) => b._id);
      const cards = await CardModel.find({
        assigneeIds: userId,
        archived: false,
        boardId: { $in: boardIds },
      }).lean<CardDoc[]>();
      const activeLists = new Set(
        (
          await ListModel.find({
            _id: { $in: [...new Set(cards.map((c) => c.listId.toString()))] },
            archived: false,
          })
            .select({ _id: 1 })
            .lean<Pick<ListDoc, "_id">[]>()
        ).map((l) => l._id.toString()),
      );
      return cards.filter((c) => activeLists.has(c.listId.toString())).sort(compareAssigned);
    })();
    assignedCache.set(ctx, cached);
  }
  return cached;
}

function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The last `n` calendar days in `timeZone` as YYYY-MM-DD, oldest first, ending today. */
export function lastDays(n: number, timeZone: string, now = new Date()): string[] {
  // en-CA formats dates as YYYY-MM-DD.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const noon = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) =>
    new Date(noon - (n - 1 - i) * DAY).toISOString().slice(0, 10),
  );
}

/** Due soonest first (none last), then highest priority, then most recently updated. */
function compareAssigned(a: CardDoc, b: CardDoc): number {
  if (a.dueDate && b.dueDate && a.dueDate.getTime() !== b.dueDate.getTime()) {
    return a.dueDate.getTime() - b.dueDate.getTime();
  }
  if (!a.dueDate !== !b.dueDate) return a.dueDate ? -1 : 1;
  const rank = (c: CardDoc) => (c.priority ? PRIORITIES.indexOf(c.priority) : PRIORITIES.length);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

/** Fresh workspace doc, replacing whatever the loaders cached earlier in this request. */
async function reloadOrg(ctx: Context, orgId: Types.ObjectId | string): Promise<OrganizationDoc> {
  const id = orgId.toString();
  const org = await OrganizationModel.findById(id).lean<OrganizationDoc>();
  if (!org) throw notFound("Workspace");
  ctx.loaders.orgById.clear(id).prime(id, org);
  ctx.loaders.projectsByOrg.clear(id);
  return org;
}

/**
 * Queries and mutations for workspaces and projects. Workspaces are stored as organizations
 * (OrganizationModel, ProjectDoc.orgId); only the GraphQL API calls them workspaces.
 */
export function defineWorkspaceSchema({
  builder,
  WorkspaceRef,
  ProjectRef,
  BoardRef,
  CardRef,
  UserRef,
  StartPageEnum,
  ActivityDayRef,
  CreateProjectPayloadRef,
}: SchemaParts) {
  builder.objectType(ActivityDayRef, {
    description: "How many things someone did on one day.",
    fields: (t) => ({
      date: t.exposeString("date", { description: "YYYY-MM-DD in the requested time zone." }),
      count: t.exposeInt("count"),
    }),
  });

  builder.queryFields((t) => ({
    workspaces: t.field({
      type: [WorkspaceRef],
      description: "Workspaces the viewer belongs to, oldest first.",
      resolve: (_root, _args, ctx) =>
        OrganizationModel.find({ memberIds: requireUserId(ctx) })
          .sort({ createdAt: 1 })
          .lean<OrganizationDoc[]>(),
    }),
    workspace: t.field({
      type: WorkspaceRef,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, { id }, ctx) => requireOrgMember(ctx, id).catch(() => null),
    }),
    project: t.field({
      type: ProjectRef,
      nullable: true,
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }, ctx) =>
        (await requireProject(ctx, id).catch(() => null))?.project ?? null,
    }),
    recentBoards: t.field({
      type: [BoardRef],
      description:
        "Boards the viewer can open, most recently active first (card work or board edits).",
      args: { limit: t.arg.int({ defaultValue: 8 }) },
      resolve: async (_root, { limit }, ctx) => {
        const boards = await boardsViewerCanOpen(requireUserId(ctx));
        const times = await Promise.all(boards.map((b) => lastActivityAt(ctx, b)));
        return boards
          .map((board, i) => ({ board, at: times[i].getTime() }))
          .sort((a, b) => b.at - a.at)
          .slice(0, Math.max(0, Math.min(limit ?? 8, 50)))
          .map((x) => x.board);
      },
    }),
    assignedCards: t.field({
      type: [CardRef],
      description:
        "Active cards assigned to the viewer on boards they can open (not in archived lists): " +
        "due soonest first, then highest priority. At most 50.",
      resolve: async (_root, _args, ctx) => {
        return (await assignedCardsOf(ctx)).slice(0, MAX_ASSIGNED_CARDS);
      },
    }),
    assignedCardCount: t.int({
      description: "How many cards assignedCards would list without its limit.",
      resolve: async (_root, _args, ctx) => (await assignedCardsOf(ctx)).length,
    }),
    myActivity: t.field({
      type: [ActivityDayRef],
      description:
        "How many things the viewer did (card activity and comments) on each of the last " +
        "`days` days in `timeZone`, oldest first, including days with none.",
      args: {
        days: t.arg.int({ defaultValue: 14 }),
        timeZone: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const userId = requireUserId(ctx);
        const days = Math.max(1, Math.min(args.days ?? 14, 60));
        if (!isTimeZone(args.timeZone)) throw badInput("Unknown time zone");
        const dates = lastDays(days, args.timeZone);
        // A day's margin so the first local day is complete in any time zone.
        const since = new Date(Date.now() - (days + 1) * DAY);
        const byDay = (field: "actorId" | "authorId") => [
          { $match: { [field]: new Types.ObjectId(userId), createdAt: { $gte: since } } },
          // One save can log several entries at once (e.g. a new card with a due date and a
          // priority); the feed shows them as one sentence, so they count as one action.
          { $group: { _id: { cardId: "$cardId", createdAt: "$createdAt" } } },
          { $project: { createdAt: "$_id.createdAt" } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: args.timeZone },
              },
              count: { $sum: 1 },
            },
          },
        ];
        type Row = { _id: string; count: number };
        const [activity, comments] = await Promise.all([
          ActivityModel.aggregate<Row>(byDay("actorId")),
          CommentModel.aggregate<Row>(byDay("authorId")),
        ]);
        const counts = new Map<string, number>();
        for (const row of [...activity, ...comments]) {
          counts.set(row._id, (counts.get(row._id) ?? 0) + row.count);
        }
        return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
      },
    }),
    sharedBoards: t.field({
      type: [BoardRef],
      description: "Boards the viewer was invited to as a guest, outside their workspaces.",
      resolve: async (_root, _args, ctx) => {
        const userId = requireUserId(ctx);
        const boards = await BoardModel.find({ memberIds: userId, ownerId: { $ne: userId } })
          .sort({ updatedAt: -1 })
          .lean<BoardDoc[]>();
        const shared: BoardDoc[] = [];
        for (const board of boards) {
          const org = await orgOfBoard(ctx, board);
          if (!org || !isOrgMember(org, userId)) shared.push(board);
        }
        return shared;
      },
    }),
  }));

  builder.mutationFields((t) => ({
    setStartPage: t.field({
      type: UserRef,
      description: "Choose where you land after signing in.",
      args: { page: t.arg({ type: StartPageEnum, required: true }) },
      resolve: async (_root, { page }, ctx) => {
        const userId = requireUserId(ctx);
        const user = (await UserModel.findByIdAndUpdate(
          userId,
          { $set: { startPage: page } },
          { returnDocument: "after" },
        ).lean<UserDoc>())!;
        ctx.loaders.userById.clear(userId).prime(userId, user);
        return user;
      },
    }),
    // ---- Workspaces ----
    createWorkspace: t.field({
      type: WorkspaceRef,
      description: "Create a workspace owned by the viewer, with one project to start in.",
      args: { name: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const userId = requireUserId(ctx);
        const input = parse(z.object({ name }), args);
        return (await createOrganization(input.name, userId)).org;
      },
    }),
    renameWorkspace: t.field({
      type: WorkspaceRef,
      args: { id: t.arg.id({ required: true }), name: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        await requireOrgOwner(ctx, args.id);
        const input = parse(z.object({ name }), args);
        await OrganizationModel.updateOne({ _id: args.id }, { $set: { name: input.name } });
        return reloadOrg(ctx, args.id);
      },
    }),
    deleteWorkspace: t.id({
      description: "Permanently delete a workspace with all its projects, boards and cards.",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }, ctx) => {
        const org = await requireOrgOwner(ctx, id);
        const projects = await ProjectModel.find({ orgId: org._id })
          .select({ _id: 1 })
          .lean<{ _id: Types.ObjectId }[]>();
        await deleteProjects(projects.map((p) => p._id));
        await OrganizationModel.deleteOne({ _id: org._id });
        return id;
      },
    }),
    addWorkspaceMember: t.field({
      type: WorkspaceRef,
      description: "Add someone who has signed in before. Any member can add people.",
      args: { workspaceId: t.arg.id({ required: true }), email: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const org = await requireOrgMember(ctx, args.workspaceId);
        const input = parse(z.object({ email }), args);
        const user = await UserModel.findOne({ email: input.email }).lean<UserDoc>();
        if (!user) throw badInput("No one with that email has signed in to Maple Flow yet");
        if (isOrgMember(org, user._id.toString())) {
          throw badInput(`${input.email} is already in this workspace`);
        }
        // Only if they aren't in yet, so a double submit can't record them twice.
        await OrganizationModel.updateOne(
          { _id: org._id, memberIds: { $ne: user._id } },
          {
            $push: {
              memberIds: user._id,
              memberSince: { userId: user._id, joinedAt: new Date() },
            },
          },
        );
        return reloadOrg(ctx, org._id);
      },
    }),
    removeWorkspaceMember: t.field({
      type: WorkspaceRef,
      description:
        "The owner can remove anyone else; any member can remove themselves (leave). " +
        "Removed people lose access to the workspace's boards unless they're guests on one.",
      args: { workspaceId: t.arg.id({ required: true }), userId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const org = await requireOrgMember(ctx, args.workspaceId);
        const target = objectId(args.userId, "User");
        const viewerIsOwner = org.ownerId.toString() === ctx.userId;
        if (org.ownerId.equals(target)) {
          throw forbidden("The owner can't leave or be removed. Delete the workspace instead.");
        }
        if (!viewerIsOwner && args.userId !== ctx.userId) {
          throw forbidden("Only the workspace owner can remove other members");
        }
        if (!isOrgMember(org, args.userId)) throw notFound("Member");
        await OrganizationModel.updateOne(
          { _id: org._id },
          { $pull: { memberIds: target, memberSince: { userId: target } } },
        );

        // Unassign them from cards on boards they can no longer open.
        const projectIds = (await ProjectModel.find({ orgId: org._id }).lean<ProjectDoc[]>()).map(
          (p) => p._id,
        );
        const lostBoards = await BoardModel.find({
          projectId: { $in: projectIds },
          memberIds: { $ne: target },
        })
          .select({ _id: 1 })
          .lean<{ _id: Types.ObjectId }[]>();
        await CardModel.updateMany(
          { boardId: { $in: lostBoards.map((b) => b._id) } },
          { $pull: { assigneeIds: target } },
        );
        return reloadOrg(ctx, org._id);
      },
    }),

    // ---- Projects ----
    createProject: t.field({
      type: CreateProjectPayloadRef,
      args: { workspaceId: t.arg.id({ required: true }), name: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const org = await requireOrgMember(ctx, args.workspaceId);
        const input = parse(z.object({ name }), args);
        const project = (
          await ProjectModel.create({ orgId: org._id, name: input.name })
        ).toObject() as ProjectDoc;
        return { project, workspace: await reloadOrg(ctx, org._id) };
      },
    }),
    renameProject: t.field({
      type: ProjectRef,
      args: { id: t.arg.id({ required: true }), name: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const { project } = await requireProject(ctx, args.id);
        const input = parse(z.object({ name }), args);
        const renamed = (await ProjectModel.findByIdAndUpdate(
          project._id,
          { $set: { name: input.name } },
          { returnDocument: "after" },
        ).lean<ProjectDoc>())!;
        ctx.loaders.projectById.clear(args.id).prime(args.id, renamed);
        return renamed;
      },
    }),
    deleteProject: t.field({
      type: WorkspaceRef,
      description: "Permanently delete a project with all its boards. Workspace owner only.",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }, ctx) => {
        const { project, org } = await requireProject(ctx, id);
        if (org.ownerId.toString() !== ctx.userId) {
          throw forbidden("Only the workspace owner can delete projects");
        }
        await deleteProjects([project._id]);
        return reloadOrg(ctx, org._id);
      },
    }),
  }));
}
