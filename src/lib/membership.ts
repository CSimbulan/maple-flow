// Badges for workspace members, from when they joined. Dates are compared in the viewer's local
// time zone, so an anniversary falls on the calendar day they see.

const DAY = 24 * 60 * 60 * 1000;

/** How long someone counts as new: a green leaf for their first week. */
export const NEW_MEMBER_DAYS = 7;

/** Whether `joinedAt` was less than a week before `now`. */
export function isNewMember(joinedAt: Date, now: Date = new Date()): boolean {
  const age = now.getTime() - joinedAt.getTime();
  return age >= 0 && age < NEW_MEMBER_DAYS * DAY;
}

/**
 * How many years ago they joined if `now` is the anniversary of `joinedAt` (same month and day,
 * at least a year later), else null. Someone who joined on February 29 celebrates on
 * February 28 in years without one.
 */
export function anniversaryYears(joinedAt: Date, now: Date = new Date()): number | null {
  const years = now.getFullYear() - joinedAt.getFullYear();
  if (years < 1) return null;
  const month = joinedAt.getMonth();
  let day = joinedAt.getDate();
  const leapDay = month === 1 && day === 29;
  if (leapDay && new Date(now.getFullYear(), 1, 29).getMonth() !== 1) day = 28;
  if (now.getMonth() !== month || now.getDate() !== day) return null;
  return years;
}

/** "Nov 27, 2026". */
export function formatJoinDate(joinedAt: Date): string {
  return joinedAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
