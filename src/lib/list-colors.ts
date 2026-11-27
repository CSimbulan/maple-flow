// Header colors for lists, shared by the server (defaults for new lists) and the client (pickers).
// Light pastels, so list titles stay dark text. Board templates will have at most five lists,
// which get these in order.

export const LIST_COLORS = ["#B3E5FC", "#C8E6C9", "#FFECB3", "#F8BBD0", "#D1C4E9"] as const;

/** Default color for the list at `index` among a board's lists (0-based), cycling after five. */
export function defaultListColor(index: number): string {
  return LIST_COLORS[Math.max(0, index) % LIST_COLORS.length];
}
