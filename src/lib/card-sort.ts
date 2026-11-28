// Orders for "Sort Cards" in a list's menu. Shared by the server (which applies a sort by
// rewriting positions) and the client (menu labels).
import { PRIORITIES, type Priority } from "./priority";

/** From the list menu, in menu order. These are also the GraphQL enum values. */
export const CARD_SORTS = [
  "PRIORITY",
  "CREATED_NEWEST",
  "CREATED_OLDEST",
  "UPDATED_NEWEST",
  "UPDATED_OLDEST",
  "DUE_DATE",
  "TITLE",
  "MOST_COMMENTS",
  "FEWEST_ASSIGNEES",
] as const;

export type CardSort = (typeof CARD_SORTS)[number];

export const CARD_SORT_LABELS: Record<CardSort, string> = {
  PRIORITY: "Priority",
  CREATED_NEWEST: "Created: Newest First",
  CREATED_OLDEST: "Created: Oldest First",
  UPDATED_NEWEST: "Updated: Newest First",
  UPDATED_OLDEST: "Updated: Oldest First",
  DUE_DATE: "Due Date",
  TITLE: "Title (A–Z)",
  MOST_COMMENTS: "Most Comments",
  FEWEST_ASSIGNEES: "Fewest Assignees",
};

/** What a sort looks at for each card. */
export type SortableCard = {
  title: string;
  priority: Priority | null;
  createdAt: Date;
  /** Latest activity entry or comment; the creation time if there's neither. */
  lastUpdated: Date;
  dueDate: Date | null;
  commentCount: number;
  assigneeCount: number;
};

type Compare = (a: SortableCard, b: SortableCard) => number;

// Highest first; cards without a priority after the lowest.
const priorityRank = (c: SortableCard) =>
  c.priority ? PRIORITIES.indexOf(c.priority) : PRIORITIES.length;

const byPriority: Compare = (a, b) => priorityRank(a) - priorityRank(b);
const oldestFirst: Compare = (a, b) => a.createdAt.getTime() - b.createdAt.getTime();
const newestFirst: Compare = (a, b) => -oldestFirst(a, b);
const titleCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** Earlier comparisons win; later ones break ties. */
const chain =
  (...compares: Compare[]): Compare =>
  (a, b) => {
    for (const compare of compares) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };

const COMPARES: Record<CardSort, Compare> = {
  // Most urgent first; among equals, whatever has waited longest.
  PRIORITY: chain(byPriority, oldestFirst),
  CREATED_NEWEST: chain(newestFirst, byPriority),
  CREATED_OLDEST: chain(oldestFirst, byPriority),
  UPDATED_NEWEST: chain(
    (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime(),
    byPriority,
    oldestFirst,
  ),
  UPDATED_OLDEST: chain(
    (a, b) => a.lastUpdated.getTime() - b.lastUpdated.getTime(),
    byPriority,
    oldestFirst,
  ),
  // Soonest first, cards without a due date last.
  DUE_DATE: chain(
    (a, b) => {
      if (!a.dueDate || !b.dueDate) return Number(!a.dueDate) - Number(!b.dueDate);
      return a.dueDate.getTime() - b.dueDate.getTime();
    },
    byPriority,
    oldestFirst,
  ),
  TITLE: chain((a, b) => titleCollator.compare(a.title, b.title), oldestFirst),
  MOST_COMMENTS: chain((a, b) => b.commentCount - a.commentCount, byPriority, oldestFirst),
  // Unassigned work first, so it gets picked up.
  FEWEST_ASSIGNEES: chain((a, b) => a.assigneeCount - b.assigneeCount, byPriority, oldestFirst),
};

/** The cards in the order `sort` puts them (a new array; the input is left alone). */
export function sortCards<T extends SortableCard>(cards: readonly T[], sort: CardSort): T[] {
  return [...cards].sort(COMPARES[sort]);
}
