import { Types } from "mongoose";
import {
  BoardModel,
  OrganizationModel,
  ProjectModel,
  type OrganizationDoc,
  type ProjectDoc,
} from "./models";

export const DEFAULT_PROJECT_NAME = "General";
/** Name of the workspace every user gets automatically. They can rename it in its settings. */
export const PERSONAL_WORKSPACE_NAME = "Personal";

/** A new organization owned by `ownerId`, with one empty project to start in. */
export async function createOrganization(
  name: string,
  ownerId: Types.ObjectId | string,
): Promise<{ org: OrganizationDoc; project: ProjectDoc }> {
  const owner = new Types.ObjectId(ownerId.toString());
  const org = (
    await OrganizationModel.create({ name, ownerId: owner, memberIds: [owner] })
  ).toObject();
  const project = (
    await ProjectModel.create({ orgId: org._id, name: DEFAULT_PROJECT_NAME })
  ).toObject();
  return { org: org as OrganizationDoc, project: project as ProjectDoc };
}

/**
 * Make sure the user belongs to at least one organization, and move any boards they own that
 * predate projects into it. Safe to call on every visit: it only writes when something is missing.
 * People those boards were shared with stay on them as guests, so nobody loses access.
 * Returns the user's organizations, oldest first.
 */
export async function ensureWorkspace(userId: string): Promise<OrganizationDoc[]> {
  const orgs = await OrganizationModel.find({ memberIds: userId })
    .sort({ createdAt: 1 })
    .lean<OrganizationDoc[]>();
  const orphanBoards = await BoardModel.find({ ownerId: userId, projectId: null })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId }[]>();
  if (orgs.length > 0 && orphanBoards.length === 0) return orgs;

  // Boards go to the first organization the user owns; create a personal one if there's none.
  let org = orgs.find((o) => o.ownerId.toString() === userId);
  let project: ProjectDoc | null = null;
  if (!org) {
    ({ org, project } = await createOrganization(PERSONAL_WORKSPACE_NAME, userId));
    orgs.push(org);
  }
  if (orphanBoards.length > 0) {
    project ??=
      (await ProjectModel.findOne({ orgId: org._id }).sort({ createdAt: 1 }).lean<ProjectDoc>()) ??
      ((
        await ProjectModel.create({ orgId: org._id, name: DEFAULT_PROJECT_NAME })
      ).toObject() as ProjectDoc);
    await BoardModel.updateMany(
      { _id: { $in: orphanBoards.map((b) => b._id) }, projectId: null },
      { $set: { projectId: project._id } },
    );
  }
  return orgs;
}
