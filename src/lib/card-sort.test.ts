import { describe, expect, it } from "vitest";
import { sortCards, type SortableCard } from "./card-sort";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

function card(title: string, overrides: Partial<SortableCard> = {}): SortableCard {
  return {
    title,
    priority: null,
    createdAt: day(1),
    lastUpdated: day(1),
    dueDate: null,
    commentCount: 0,
    assigneeCount: 0,
    ...overrides,
  };
}

const titles = (cards: SortableCard[]) => cards.map((c) => c.title);

describe("sortCards", () => {
  it("sorts by priority, none last, then oldest first", () => {
    const cards = [
      card("none", { createdAt: day(1) }),
      card("low", { priority: "LOW" }),
      card("high new", { priority: "HIGH", createdAt: day(5) }),
      card("high old", { priority: "HIGH", createdAt: day(2) }),
      card("highest", { priority: "HIGHEST", createdAt: day(9) }),
    ];
    expect(titles(sortCards(cards, "PRIORITY"))).toEqual([
      "highest",
      "high old",
      "high new",
      "low",
      "none",
    ]);
  });

  it("sorts by creation date either way, then priority", () => {
    const cards = [
      card("b", { createdAt: day(2) }),
      card("a low", { createdAt: day(1), priority: "LOW" }),
      card("a high", { createdAt: day(1), priority: "HIGH" }),
      card("c", { createdAt: day(3) }),
    ];
    expect(titles(sortCards(cards, "CREATED_NEWEST"))).toEqual(["c", "b", "a high", "a low"]);
    expect(titles(sortCards(cards, "CREATED_OLDEST"))).toEqual(["a high", "a low", "b", "c"]);
  });

  it("sorts by last update either way", () => {
    const cards = [
      card("x", { lastUpdated: day(5) }),
      card("y", { lastUpdated: day(9) }),
      card("z", { lastUpdated: day(1) }),
    ];
    expect(titles(sortCards(cards, "UPDATED_NEWEST"))).toEqual(["y", "x", "z"]);
    expect(titles(sortCards(cards, "UPDATED_OLDEST"))).toEqual(["z", "x", "y"]);
  });

  it("sorts by due date, soonest first and none last, ties by priority", () => {
    const cards = [
      card("none high", { priority: "HIGH" }),
      card("later", { dueDate: day(20) }),
      card("none", {}),
      card("soon", { dueDate: day(3) }),
      card("soon urgent", { dueDate: day(3), priority: "HIGHEST" }),
    ];
    expect(titles(sortCards(cards, "DUE_DATE"))).toEqual([
      "soon urgent",
      "soon",
      "later",
      "none high",
      "none",
    ]);
  });

  it("sorts titles alphabetically, ignoring case and with numbers in order", () => {
    const cards = [card("banana"), card("Card 10"), card("apple"), card("card 9")];
    expect(titles(sortCards(cards, "TITLE"))).toEqual(["apple", "banana", "card 9", "Card 10"]);
  });

  it("sorts by most comments and by fewest assignees", () => {
    const cards = [
      card("one", { commentCount: 1, assigneeCount: 2 }),
      card("three", { commentCount: 3, assigneeCount: 0 }),
      card("none", { commentCount: 0, assigneeCount: 1 }),
    ];
    expect(titles(sortCards(cards, "MOST_COMMENTS"))).toEqual(["three", "one", "none"]);
    expect(titles(sortCards(cards, "FEWEST_ASSIGNEES"))).toEqual(["three", "none", "one"]);
  });

  it("leaves the input alone", () => {
    const cards = [card("b"), card("a")];
    sortCards(cards, "TITLE");
    expect(titles(cards)).toEqual(["b", "a"]);
  });
});
