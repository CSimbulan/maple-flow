import type { LabelColor } from "@/server/db/models";

export const LABEL_HEX: Record<LabelColor, string> = {
  green: "#4bce97",
  yellow: "#e2b203",
  orange: "#fea362",
  red: "#f87168",
  purple: "#9f8fef",
  blue: "#579dff",
};

export const LABELS = Object.keys(LABEL_HEX) as LabelColor[];

// Reds and oranges that all keep white text at 4.5:1 contrast or better. The first is the default.
export const BOARD_BACKGROUNDS = [
  "#c62828",
  "#c2410c",
  "#b71c1c",
  "#bf360c",
  "#d32f2f",
  "#b45309",
  "#9a3412",
  "#ad1457",
];
