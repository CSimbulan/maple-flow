import {
  CardModel,
  ListModel,
  type BoardDoc,
  type CardDoc,
  type ListDoc,
  type OrganizationDoc,
  type ProjectDoc,
} from "../db/models";
import type { Context } from "./context";
import { forbidden, notFound, objectId, unauthenticated } from "./errors";

/*
 * Access rules
 * - Organization members can open every board in the org's projects.
 * - A board's own memberIds (its creator and guests invited with Share) can open that board.
 * - The org owner manages the org: rename, delete, remove members, delete projects.
 * - A board's creator and the org owner can delete the board and remove its guests.
 * Anything the caller can't open is reported as "not found", so ids don't leak.
 */

export function requireUserId(ctx: Context): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

const includes = (ids: { toString(): string }[], userId: string) =>
  ids.some((id) => id.toString() === userId);

export const isOrgMember = (org: OrganizationDoc, userId: string) =>
  includes(org.memberIds, userId);

/** The organization a board belongs to, through its project (null for unmigrated boards). */
export async function orgOfBoard(ctx: Context, board: BoardDoc): Promise<OrganizationDoc | null> {
  if (!board.projectId) return null;
  const project = await ctx.loaders.projectById.load(board.projectId.toString());
  return project ? ctx.loaders.orgById.load(project.orgId.toString()) : null;
}

export async function canOpenBoard(ctx: Context, board: BoardDoc, userId: string) {
  if (includes(board.memberIds, userId)) return true;
  const org = await orgOfBoard(ctx, board);
  return !!org && isOrgMember(org, userId);
}

/** Ids of everyone who can open the board: org members plus the board's own members. */
export async function boardAudienceIds(ctx: Context, board: BoardDoc): Promise<string[]> {
  const org = await orgOfBoard(ctx, board);
  return [...new Set([...(org?.memberIds ?? []), ...board.memberIds].map(String))];
}

export async function canManageBoard(ctx: Context, board: BoardDoc, userId: string) {
  if (board.ownerId.toString() === userId) return true;
  const org = await orgOfBoard(ctx, board);
  return !!org && org.ownerId.toString() === userId;
}

/** The board, if the caller can open it. */
export async function requireBoardAccess(ctx: Context, boardId: string): Promise<BoardDoc> {
  const userId = requireUserId(ctx);
  objectId(boardId, "Board");
  const board = await ctx.loaders.boardById.load(boardId);
  if (!board || !(await canOpenBoard(ctx, board, userId))) throw notFound("Board");
  return board;
}

/** The board, if the caller is its creator or the org owner. */
export async function requireBoardManager(ctx: Context, boardId: string): Promise<BoardDoc> {
  const board = await requireBoardAccess(ctx, boardId);
  if (!(await canManageBoard(ctx, board, ctx.userId!))) {
    throw forbidden("Only the board's creator or the workspace owner can do that");
  }
  return board;
}

/** The organization, if the caller is a member. */
export async function requireOrgMember(ctx: Context, orgId: string): Promise<OrganizationDoc> {
  const userId = requireUserId(ctx);
  objectId(orgId, "Workspace");
  const org = await ctx.loaders.orgById.load(orgId);
  if (!org || !isOrgMember(org, userId)) throw notFound("Workspace");
  return org;
}

export async function requireOrgOwner(ctx: Context, orgId: string): Promise<OrganizationDoc> {
  const org = await requireOrgMember(ctx, orgId);
  if (org.ownerId.toString() !== ctx.userId) {
    throw forbidden("Only the workspace owner can do that");
  }
  return org;
}

/** The project and its organization, if the caller is an org member. */
export async function requireProject(
  ctx: Context,
  projectId: string,
): Promise<{ project: ProjectDoc; org: OrganizationDoc }> {
  requireUserId(ctx);
  objectId(projectId, "Project");
  const project = await ctx.loaders.projectById.load(projectId);
  if (!project) throw notFound("Project");
  const org = await requireOrgMember(ctx, project.orgId.toString()).catch(() => {
    throw notFound("Project");
  });
  return { project, org };
}

/** Which items to look among: active ones (default), archived ones, or either. */
type ArchivedFilter = { archived?: boolean | "any" };
const archivedQuery = (archived: boolean | "any") => (archived === "any" ? {} : { archived });

/** The list, if the caller is a board member. `archived` picks active, archived or either. */
export async function requireList(
  ctx: Context,
  listId: string,
  { archived = false }: ArchivedFilter = {},
): Promise<ListDoc> {
  const list = await ListModel.findOne({
    _id: objectId(listId, "List"),
    ...archivedQuery(archived),
  }).lean<ListDoc>();
  if (!list) throw notFound("List");
  await requireBoardAccess(ctx, list.boardId.toString()).catch(() => {
    throw notFound("List");
  });
  return list;
}

/** The card, if the caller is a board member. `archived` picks active, archived or either. */
export async function requireCard(
  ctx: Context,
  cardId: string,
  { archived = false }: ArchivedFilter = {},
): Promise<CardDoc> {
  const card = await CardModel.findOne({
    _id: objectId(cardId, "Card"),
    ...archivedQuery(archived),
  }).lean<CardDoc>();
  if (!card) throw notFound("Card");
  await requireBoardAccess(ctx, card.boardId.toString()).catch(() => {
    throw notFound("Card");
  });
  return card;
}
