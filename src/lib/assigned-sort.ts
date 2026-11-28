// Orders for the home page's "Assigned to Me" list. Sorting happens in the browser (the list is
// at most 50 cards) and the choice is remembered per browser.
import { PRIORITIES, type Priority } from "./priority";

export const ASSIGNED_SORTS = ["DUE_SOON", "PRIORITY", "NEWEST", "OLDEST", "BOARD"] as const;

export type AssignedSort = (typeof ASSIGNED_SORTS)[number];

export const ASSIGNED_SORT_LABELS: Record<AssignedSort, string> = {
  DUE_SOON: "Due Soon",
  PRIORITY: "Highest Priority",
  NEWEST: "Newest",
  OLDEST: "Oldest",
  BOARD: "Board Name",
};

export const DEFAULT_ASSIGNED_SORT: AssignedSort = "DUE_SOON";

/** What the orders look at. Dates are ISO strings, as the API returns them. */
export type AssignedSortable = {
  title: string;
  priority: Priority | null;
  dueDate: string | null;
  createdAt: string;
  board: { title: string };
  list: { title: string };
};

type Compare = (a: AssignedSortable, b: AssignedSortable) => number;

// Highest first; cards without a priority after the lowest.
const rank = (c: AssignedSortable) =>
  c.priority ? PRIORITIES.indexOf(c.priority) : PRIORITIES.length;
const byPriority: Compare = (a, b) => rank(a) - rank(b);
// Soonest first, cards without a due date last.
const byDue: Compare = (a, b) => {
  if (!a.dueDate || !b.dueDate) return Number(!a.dueDate) - Number(!b.dueDate);
  return Date.parse(a.dueDate) - Date.parse(b.dueDate);
};
const newestFirst: Compare = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const chain =
  (...compares: Compare[]): Compare =>
  (a, b) => {
    for (const compare of compares) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };

const COMPARES: Record<AssignedSort, Compare> = {
  DUE_SOON: chain(byDue, byPriority, newestFirst),
  PRIORITY: chain(byPriority, byDue, newestFirst),
  NEWEST: newestFirst,
  OLDEST: (a, b) => -newestFirst(a, b),
  BOARD: chain(
    (a, b) => collator.compare(a.board.title, b.board.title),
    (a, b) => collator.compare(a.list.title, b.list.title),
    byDue,
    byPriority,
  ),
};

/** The cards in the order `sort` puts them (a new array). */
export function sortAssigned<T extends AssignedSortable>(
  cards: readonly T[],
  sort: AssignedSort,
): T[] {
  return [...cards].sort(COMPARES[sort]);
}

/** A stored value back to a sort, or the default if it isn't one (e.g. from an older version). */
export function parseAssignedSort(value: string | null | undefined): AssignedSort {
  return (ASSIGNED_SORTS as readonly string[]).includes(value ?? "")
    ? (value as AssignedSort)
    : DEFAULT_ASSIGNED_SORT;
}
