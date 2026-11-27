import type { BoardDetailQuery, MoveCardMutation, MoveListMutation } from "@/gql/graphql";
import { insertIndex, planInsert } from "@/lib/position";

export type Board = NonNullable<BoardDetailQuery["board"]>;
export type BoardList = Board["lists"][number];
export type BoardCard = BoardList["cards"][number];

/** Order of lists and of the cards in each list, as ids. Used as local state while dragging. */
export type Columns = { listIds: string[]; cards: Record<string, string[]> };

export function columnsOf(board: Board): Columns {
  return {
    listIds: board.lists.map((l) => l.id),
    cards: Object.fromEntries(board.lists.map((l) => [l.id, l.cards.map((c) => c.id)])),
  };
}

export function listOfCard(columns: Columns, cardId: string): string | undefined {
  return columns.listIds.find((l) => columns.cards[l]?.includes(cardId));
}

/** Neighbors of `id` within `ids`: the item directly above (before) and below (after). */
export function neighbors(ids: readonly string[], id: string) {
  const i = ids.indexOf(id);
  return { beforeId: ids[i - 1] ?? null, afterId: ids[i + 1] ?? null };
}

/**
 * The response the server will send for moveCard, computed from the cached board so the UI
 * updates immediately. The server computes the same position from the same neighbors.
 */
export function optimisticMoveCard(
  board: Board,
  cardId: string,
  toListId: string,
  beforeId: string | null,
  afterId: string | null,
): MoveCardMutation {
  const fromList = board.lists.find((l) => l.cards.some((c) => c.id === cardId));
  const toList = board.lists.find((l) => l.id === toListId);
  const card = fromList?.cards.find((c) => c.id === cardId);
  if (!fromList || !toList || !card) throw new Error("Card or list not in board");

  const fromCards = fromList.cards.filter((c) => c.id !== cardId);
  const siblings = toList.id === fromList.id ? fromCards : toList.cards;
  const index = insertIndex(siblings, beforeId, afterId);
  const at = index === -1 ? siblings.length : index;
  const moved: BoardCard = {
    ...card,
    listId: toListId,
    position: planInsert(siblings, at).position,
  };
  const toCards = [...siblings.slice(0, at), moved, ...siblings.slice(at)];
  const sameList = toList.id === fromList.id;

  return {
    moveCard: {
      __typename: "MoveCardPayload",
      card: moved,
      fromList: {
        __typename: "List",
        id: fromList.id,
        cards: (sameList ? toCards : fromCards).map((c) => ({
          __typename: "Card" as const,
          id: c.id,
          position: c.position,
        })),
      },
      toList: { __typename: "List", id: toList.id, cards: toCards },
    },
  };
}

export function optimisticMoveList(
  board: Board,
  listId: string,
  beforeId: string | null,
  afterId: string | null,
): MoveListMutation {
  const list = board.lists.find((l) => l.id === listId);
  if (!list) throw new Error("List not in board");
  const siblings = board.lists.filter((l) => l.id !== listId);
  const index = insertIndex(siblings, beforeId, afterId);
  const at = index === -1 ? siblings.length : index;
  const moved = { ...list, position: planInsert(siblings, at).position };
  const lists = [...siblings.slice(0, at), moved, ...siblings.slice(at)];
  return {
    moveList: {
      __typename: "Board",
      id: board.id,
      lists: lists.map((l) => ({ __typename: "List" as const, id: l.id, position: l.position })),
    },
  };
}
