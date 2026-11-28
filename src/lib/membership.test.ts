import { describe, expect, it } from "vitest";
import { anniversaryYears, isNewMember } from "./membership";

// Local dates, matching how the functions compare them.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe("isNewMember", () => {
  it("is true for the first week only", () => {
    const joined = at(2026, 11, 1);
    expect(isNewMember(joined, at(2026, 11, 1, 13))).toBe(true);
    expect(isNewMember(joined, at(2026, 11, 8, 11))).toBe(true);
    expect(isNewMember(joined, at(2026, 11, 8, 12))).toBe(false);
    expect(isNewMember(joined, at(2026, 10, 31))).toBe(false);
  });
});

describe("anniversaryYears", () => {
  it("counts whole years on the same month and day", () => {
    const joined = at(2024, 11, 27);
    expect(anniversaryYears(joined, at(2025, 11, 27, 0))).toBe(1);
    expect(anniversaryYears(joined, at(2026, 11, 27, 23))).toBe(2);
    expect(anniversaryYears(joined, at(2026, 11, 28))).toBeNull();
    expect(anniversaryYears(joined, at(2024, 11, 27, 18))).toBeNull();
  });

  it("celebrates February 29 joins on February 28 in other years", () => {
    const joined = at(2024, 2, 29);
    expect(anniversaryYears(joined, at(2025, 2, 28))).toBe(1);
    expect(anniversaryYears(joined, at(2025, 3, 1))).toBeNull();
    expect(anniversaryYears(joined, at(2028, 2, 29))).toBe(4);
    expect(anniversaryYears(joined, at(2028, 2, 28))).toBeNull();
  });
});
