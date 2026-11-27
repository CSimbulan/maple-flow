// Card tags: named, colored, and defined per board. Shared by the server (defaults for new boards)
// and the client (the color picker and tag chips).

/**
 * Colors offered when creating or editing a tag, from Material UI: 500 shades, except red, green
 * and blue 800 (so they take white text) and pink 300. In hue order round the color wheel, then the
 * neutrals, which the palette menu shows as a 3×3 grid. Text on each is white or black, whichever
 * `tagTextColor` picks.
 */
export const TAG_COLORS = [
  "#c62828", // red 800
  "#ff9800", // orange 500
  "#ffeb3b", // yellow 500
  "#2e7d32", // green 800
  "#1565c0", // blue 800
  "#9c27b0", // purple 500
  "#f06292", // pink 300
  "#9e9e9e", // grey 500
  "#000000", // black
] as const;

/** Tags every new board starts with, for software projects. Board templates will bring their own. */
export const DEFAULT_TAGS: readonly { name: string; color: string }[] = [
  { name: "New Feature", color: "#2e7d32" },
  { name: "Bug", color: "#c62828" },
  { name: "UX/UI", color: "#9c27b0" },
  { name: "Improvement", color: "#f06292" },
  { name: "Tech Debt", color: "#ff9800" },
  { name: "Documentation", color: "#9e9e9e" },
  { name: "Testing", color: "#1565c0" },
  { name: "Performance", color: "#ffeb3b" },
];

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Text color for a tag: white when it reaches 4.5:1 contrast on `color` (WCAG AA), otherwise
 * black. Works for any hex, so tags with older or custom colors get readable text too.
 */
export function tagTextColor(color: string): "#fff" | "#000" {
  const whiteContrast = 1.05 / (luminance(color) + 0.05);
  return whiteContrast >= 4.5 ? "#fff" : "#000";
}
