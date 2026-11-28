import { Types } from "mongoose";
import {
  BoardModel,
  OrganizationModel,
  ProjectModel,
  type MemberSince,
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
    await OrganizationModel.create({
      name,
      ownerId: owner,
      memberIds: [owner],
      memberSince: [{ userId: owner, joinedAt: new Date() }],
    })
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

/**
 * When each member of `org` joined, in `memberIds` order. Members from before join dates were
 * recorded get one now (a lazy migration, like ensureWorkspace): the owner the organization's
 * creation date, everyone else the current time. `org` is updated in place.
 */
export async function joinDatesOf(org: OrganizationDoc): Promise<MemberSince[]> {
  const known = new Map((org.memberSince ?? []).map((m) => [m.userId.toString(), m]));
  const missing: MemberSince[] = org.memberIds
    .filter((id) => !known.has(id.toString()))
    .map((userId) => ({
      userId,
      joinedAt: userId.equals(org.ownerId) ? org.createdAt : new Date(),
    }));
  if (missing.length > 0) {
    // One update per member, each only if they still have no date, so concurrent requests
    // can't record someone twice. timestamps: false keeps the workspace's updatedAt.
    await OrganizationModel.bulkWrite(
      missing.map((m) => ({
        updateOne: {
          filter: { _id: org._id, "memberSince.userId": { $ne: m.userId } },
          update: { $push: { memberSince: m } },
          timestamps: false,
        },
      })),
    );
    for (const m of missing) known.set(m.userId.toString(), m);
    org.memberSince = [...(org.memberSince ?? []), ...missing];
  }
  return org.memberIds.map((id) => known.get(id.toString())!);
}
