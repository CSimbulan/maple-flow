import { describe, expect, it } from "vitest";
import {
  columnsOf,
  listOfCard,
  neighbors,
  optimisticMoveCard,
  optimisticMoveList,
  type Board,
  type BoardCard,
} from "./board-moves";

function card(id: string, listId: string, position: string): BoardCard {
  return {
    __typename: "Card",
    id,
    title: id,
    description: "",
    labels: [],
    dueDate: null,
    position,
    listId,
    assignees: [],
  };
}

const user = {
  __typename: "User" as const,
  id: "u1",
  name: "Ann",
  email: "ann@example.com",
  image: null,
};

const board: Board = {
  __typename: "Board",
  id: "b1",
  title: "Board",
  background: "#000000",
  viewerCanManage: true,
  project: null,
  guests: [],
  owner: user,
  members: [user],
  lists: [
    {
      __typename: "List",
      id: "L1",
      title: "To do",
      position: "a0",
      cards: [card("c1", "L1", "a0"), card("c2", "L1", "a1"), card("c3", "L1", "a2")],
    },
    {
      __typename: "List",
      id: "L2",
      title: "Doing",
      position: "a1",
      cards: [card("c4", "L2", "a0")],
    },
    { __typename: "List", id: "L3", title: "Done", position: "a2", cards: [] },
  ],
};

describe("columns", () => {
  it("maps lists to card ids", () => {
    const cols = columnsOf(board);
    expect(cols.listIds).toEqual(["L1", "L2", "L3"]);
    expect(listOfCard(cols, "c4")).toBe("L2");
  });

  it("finds neighbors", () => {
    expect(neighbors(["a", "b", "c"], "a")).toEqual({ beforeId: null, afterId: "b" });
    expect(neighbors(["a", "b", "c"], "b")).toEqual({ beforeId: "a", afterId: "c" });
  });
});

describe("optimisticMoveCard", () => {
  it("moves a card to another list between neighbors", () => {
    const res = optimisticMoveCard(board, "c1", "L2", null, "c4").moveCard;
    expect(res.fromList.cards.map((c) => c.id)).toEqual(["c2", "c3"]);
    expect(res.toList.cards.map((c) => c.id)).toEqual(["c1", "c4"]);
    expect(res.card.listId).toBe("L2");
    expect(res.card.position < "a0").toBe(true);
  });

  it("moves a card into an empty list", () => {
    const res = optimisticMoveCard(board, "c2", "L3", null, null).moveCard;
    expect(res.toList.cards.map((c) => c.id)).toEqual(["c2"]);
  });

  it("reorders within a list, keeping both list views identical", () => {
    const res = optimisticMoveCard(board, "c3", "L1", null, "c1").moveCard;
    expect(res.toList.cards.map((c) => c.id)).toEqual(["c3", "c1", "c2"]);
    expect(res.fromList.cards.map((c) => c.id)).toEqual(["c3", "c1", "c2"]);
  });
});

describe("optimisticMoveList", () => {
  it("moves the last list to the front", () => {
    const res = optimisticMoveList(board, "L3", null, "L1").moveList;
    expect(res.lists.map((l) => l.id)).toEqual(["L3", "L1", "L2"]);
    expect(res.lists[0].position < "a0").toBe(true);
  });
});
