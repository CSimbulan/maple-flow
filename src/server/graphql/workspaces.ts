import type { Types } from "mongoose";
import { z } from "zod";
import { deleteProjects } from "../db/cascade";
import {
  BoardModel,
  CardModel,
  OrganizationModel,
  ProjectModel,
  UserModel,
  type BoardDoc,
  type OrganizationDoc,
  type ProjectDoc,
  type UserDoc,
} from "../db/models";
import { createOrganization } from "../db/workspace";
import type { SchemaParts } from "./builder";
import type { Context } from "./context";
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
  CreateProjectPayloadRef,
}: SchemaParts) {
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
        await OrganizationModel.updateOne({ _id: org._id }, { $addToSet: { memberIds: user._id } });
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
        await OrganizationModel.updateOne({ _id: org._id }, { $pull: { memberIds: target } });

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
