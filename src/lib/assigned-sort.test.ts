import { describe, expect, it } from "vitest";
import { parseAssignedSort, sortAssigned, type AssignedSortable } from "./assigned-sort";

const card = (title: string, o: Partial<AssignedSortable> = {}): AssignedSortable => ({
  title,
  priority: null,
  dueDate: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  board: { title: "Launch" },
  list: { title: "To do" },
  ...o,
});
const titles = (cards: AssignedSortable[]) => cards.map((c) => c.title);

const cards = [
  card("no date, highest", { priority: "HIGHEST", createdAt: "2026-11-05T00:00:00.000Z" }),
  card("due later", { dueDate: "2026-12-20T00:00:00.000Z", createdAt: "2026-11-02T00:00:00.000Z" }),
  card("due soon, low", {
    dueDate: "2026-12-01T00:00:00.000Z",
    priority: "LOW",
    createdAt: "2026-11-03T00:00:00.000Z",
    board: { title: "Website" },
  }),
  card("due soon, high", {
    dueDate: "2026-12-01T00:00:00.000Z",
    priority: "HIGH",
    createdAt: "2026-11-04T00:00:00.000Z",
    board: { title: "apps" },
    list: { title: "Doing" },
  }),
];

describe("sortAssigned", () => {
  it("puts the soonest due first, then the highest priority, undated last", () => {
    expect(titles(sortAssigned(cards, "DUE_SOON"))).toEqual([
      "due soon, high",
      "due soon, low",
      "due later",
      "no date, highest",
    ]);
  });

  it("puts the highest priority first, then the soonest due", () => {
    expect(titles(sortAssigned(cards, "PRIORITY"))).toEqual([
      "no date, highest",
      "due soon, high",
      "due soon, low",
      "due later",
    ]);
  });

  it("sorts by creation date either way", () => {
    expect(titles(sortAssigned(cards, "NEWEST"))).toEqual([
      "no date, highest",
      "due soon, high",
      "due soon, low",
      "due later",
    ]);
    expect(titles(sortAssigned(cards, "OLDEST"))).toEqual([
      "due later",
      "due soon, low",
      "due soon, high",
      "no date, highest",
    ]);
  });

  it("groups by board name, ignoring case, then list, then due date", () => {
    expect(titles(sortAssigned(cards, "BOARD"))).toEqual([
      "due soon, high",
      "due later",
      "no date, highest",
      "due soon, low",
    ]);
  });

  it("reads stored choices, falling back to Due Soon", () => {
    expect(parseAssignedSort("NEWEST")).toBe("NEWEST");
    expect(parseAssignedSort("nonsense")).toBe("DUE_SOON");
    expect(parseAssignedSort(null)).toBe("DUE_SOON");
  });
});
