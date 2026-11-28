import { describe, expect, it } from "vitest";
import { dueBucket, localDay } from "./due-buckets";

// Midday local time on Nov 28, 2026.
const today = new Date(2026, 10, 28, 12);
const due = (day: string) => `${day}T00:00:00.000Z`;

describe("dueBucket", () => {
  it("sorts due days into overdue, today, the next 7 days and later", () => {
    expect(dueBucket(due("2026-11-27"), today)).toBe("overdue");
    expect(dueBucket(due("2026-11-28"), today)).toBe("today");
    expect(dueBucket(due("2026-11-29"), today)).toBe("week");
    // Today plus six more days is the last day of the week window.
    expect(dueBucket(due("2026-12-04"), today)).toBe("week");
    expect(dueBucket(due("2026-12-05"), today)).toBe("later");
    expect(dueBucket(null, today)).toBe("none");
  });

  it("uses the local calendar day, also late in the evening", () => {
    const lateEvening = new Date(2026, 10, 28, 23, 59);
    expect(dueBucket(due("2026-11-28"), lateEvening)).toBe("today");
    expect(localDay(lateEvening)).toBe("2026-11-28");
  });

  it("crosses month and year ends", () => {
    const newYearsEve = new Date(2026, 11, 31, 9);
    expect(dueBucket(due("2027-01-06"), newYearsEve)).toBe("week");
    expect(dueBucket(due("2027-01-07"), newYearsEve)).toBe("later");
  });
});
