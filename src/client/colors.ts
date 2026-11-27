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

export const BOARD_BACKGROUNDS = [
  "#0079bf",
  "#2e7d6b",
  "#b04632",
  "#89609e",
  "#cd5a91",
  "#4bbf6b",
  "#00aecc",
  "#838c91",
];
