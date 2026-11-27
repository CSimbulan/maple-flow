import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

export type Positioned = { id: string; position: string };

export type InsertPlan = {
  /** Position for the inserted item. */
  position: string;
  /** Sibling positions to rewrite; empty unless the existing keys had to be rebalanced. */
  rebalance: Positioned[];
};

/**
 * Index the moved item lands at, given its new neighbors.
 * `beforeId` is the item directly above it, `afterId` the one directly below.
 * With neither, the item goes to the end. Returns -1 if a neighbor isn't in `siblings`.
 */
export function insertIndex(
  siblings: readonly { id: string }[],
  beforeId: string | null | undefined,
  afterId: string | null | undefined,
): number {
  if (beforeId) {
    const i = siblings.findIndex((s) => s.id === beforeId);
    return i === -1 ? -1 : i + 1;
  }
  if (afterId) return siblings.findIndex((s) => s.id === afterId);
  return siblings.length;
}

/**
 * Plan the position for an item inserted at `index` among `siblings`
 * (sorted by position, not including the item being moved).
 */
export function planInsert(siblings: readonly Positioned[], index: number): InsertPlan {
  const a = siblings[index - 1]?.position ?? null;
  const b = siblings[index]?.position ?? null;
  if (a === null || b === null || a < b) {
    return { position: generateKeyBetween(a, b), rebalance: [] };
  }
  // Keys collided or are out of order (e.g. two concurrent inserts): renumber the whole list.
  const keys = generateNKeysBetween(null, null, siblings.length + 1);
  const rebalance = siblings.map((s, i) => ({ id: s.id, position: keys[i < index ? i : i + 1] }));
  return { position: keys[index], rebalance };
}

export function sortByPosition<T extends { position: string }>(items: readonly T[]): T[] {
  // Plain code-unit comparison, matching MongoDB's default string sort. Not localeCompare.
  return [...items].sort((x, y) =>
    x.position < y.position ? -1 : x.position > y.position ? 1 : 0,
  );
}

/** `n` evenly spaced, increasing positions for a brand-new group. */
export function initialPositions(n: number): string[] {
  return generateNKeysBetween(null, null, n);
}
