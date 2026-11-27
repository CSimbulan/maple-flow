import { describe, expect, it } from "vitest";
import { DEFAULT_TAGS, TAG_COLORS, tagTextColor } from "./tags";

describe("tagTextColor", () => {
  it("uses white only where it reaches 4.5:1, black otherwise", () => {
    expect(Object.fromEntries(TAG_COLORS.map((c) => [c, tagTextColor(c)]))).toEqual({
      "#c62828": "#fff", // red 800: 5.6:1
      "#ff9800": "#000",
      "#ffeb3b": "#000",
      "#2e7d32": "#fff", // green 800: 5.1:1
      "#f06292": "#000", // pink 300: white is only 3.1:1
      "#1565c0": "#fff", // blue 800: 5.8:1
      "#9c27b0": "#fff", // purple: 6.3:1
      "#9e9e9e": "#000",
      "#000000": "#fff",
    });
  });

  it("handles colors outside the palette, like older dark tags", () => {
    expect(tagTextColor("#c62828")).toBe("#fff");
    expect(tagTextColor("#ffffff")).toBe("#000");
  });

  it("gives default tags colors from the palette", () => {
    for (const tag of DEFAULT_TAGS) expect(TAG_COLORS).toContain(tag.color);
  });
});
