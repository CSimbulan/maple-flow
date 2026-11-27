import { CardModel, ListModel, type BoardDoc, type CardDoc, type ListDoc } from "../db/models";
import type { Context } from "./context";
import { forbidden, notFound, objectId, unauthenticated } from "./errors";

export function requireUserId(ctx: Context): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

export function isMember(board: BoardDoc, userId: string): boolean {
  return board.memberIds.some((m) => m.toString() === userId);
}

/** The board, if the caller is a member. Non-members get "not found" so ids don't leak. */
export async function requireBoardMember(ctx: Context, boardId: string): Promise<BoardDoc> {
  const userId = requireUserId(ctx);
  objectId(boardId, "Board");
  const board = await ctx.loaders.boardById.load(boardId);
  if (!board || !isMember(board, userId)) throw notFound("Board");
  return board;
}

export async function requireBoardOwner(ctx: Context, boardId: string): Promise<BoardDoc> {
  const board = await requireBoardMember(ctx, boardId);
  if (board.ownerId.toString() !== ctx.userId) throw forbidden("Only the board owner can do that");
  return board;
}

export async function requireList(ctx: Context, listId: string): Promise<ListDoc> {
  const list = await ListModel.findOne({
    _id: objectId(listId, "List"),
    archived: false,
  }).lean<ListDoc>();
  if (!list) throw notFound("List");
  await requireBoardMember(ctx, list.boardId.toString()).catch(() => {
    throw notFound("List");
  });
  return list;
}

export async function requireCard(ctx: Context, cardId: string): Promise<CardDoc> {
  const card = await CardModel.findOne({
    _id: objectId(cardId, "Card"),
    archived: false,
  }).lean<CardDoc>();
  if (!card) throw notFound("Card");
  await requireBoardMember(ctx, card.boardId.toString()).catch(() => {
    throw notFound("Card");
  });
  return card;
}
