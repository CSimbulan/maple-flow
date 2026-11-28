// Which "at a glance" group a due date falls in, for the home page's number tiles.
// Due dates are calendar days (stored as midnight UTC), so they're compared as YYYY-MM-DD
// strings against the viewer's local calendar day, never as moments in time.

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

/** How many days, today included, count as "Next 7 Days". */
export const WEEK_DAYS = 7;

/** A date as YYYY-MM-DD in the local time zone. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The calendar day `days` after `day` (both YYYY-MM-DD). */
function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + days));
}

/**
 * The group for a card due on `dueDate` (an ISO string, or null for none), seen on `today`.
 * "week" is from today through the next six days; "today" is also in that window but is
 * reported as "today".
 */
export function dueBucket(dueDate: string | null, today: Date = new Date()): DueBucket {
  if (!dueDate) return "none";
  const due = dueDate.slice(0, 10);
  const now = localDay(today);
  if (due < now) return "overdue";
  if (due === now) return "today";
  if (due <= addDays(now, WEEK_DAYS - 1)) return "week";
  return "later";
}
