import { describe, expect, it } from "vitest";
import { initialPositions, insertIndex, planInsert, sortByPosition } from "./position";

const items = (positions: string[]) => positions.map((position, i) => ({ id: `i${i}`, position }));

describe("insertIndex", () => {
  const siblings = items(["a0", "a1", "a2"]);
  it("places after beforeId", () => expect(insertIndex(siblings, "i0", null)).toBe(1));
  it("places at afterId", () => expect(insertIndex(siblings, null, "i0")).toBe(0));
  it("appends with no neighbors", () => expect(insertIndex(siblings, null, null)).toBe(3));
  it("prefers beforeId when both are given", () =>
    expect(insertIndex(siblings, "i1", "i2")).toBe(2));
  it("returns -1 for an unknown neighbor", () =>
    expect(insertIndex(siblings, "nope", null)).toBe(-1));
});

describe("planInsert", () => {
  it("creates a first key in an empty group", () => {
    expect(planInsert([], 0)).toEqual({ position: "a0", rebalance: [] });
  });

  it("generates keys that sort between neighbors", () => {
    const siblings = items(initialPositions(3));
    for (const index of [0, 1, 2, 3]) {
      const { position, rebalance } = planInsert(siblings, index);
      expect(rebalance).toEqual([]);
      const order = sortByPosition([...siblings, { id: "new", position }]).map((s) => s.id);
      expect(order.indexOf("new")).toBe(index);
    }
  });

  it("rebalances when neighbors share a key", () => {
    const siblings = items(["a0", "a1", "a1", "a2"]);
    const { position, rebalance } = planInsert(siblings, 2);
    expect(rebalance).toHaveLength(4);
    const all = sortByPosition([...rebalance, { id: "new", position }]).map((s) => s.id);
    expect(all).toEqual(["i0", "i1", "new", "i2", "i3"]);
    expect(new Set([...rebalance.map((r) => r.position), position]).size).toBe(5);
  });

  it("supports many inserts at the same spot", () => {
    let siblings = items(["a0", "a1"]);
    for (let n = 0; n < 50; n++) {
      const { position } = planInsert(siblings, 1);
      siblings = sortByPosition([...siblings, { id: `n${n}`, position }]);
    }
    expect(siblings[0].id).toBe("i0");
    expect(siblings.at(-1)!.id).toBe("i1");
    expect(siblings[1].id).toBe("n49");
  });
});
