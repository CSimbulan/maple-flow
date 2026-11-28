/** A date in the viewer's locale and time zone, e.g. "Nov 27, 2026". */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
