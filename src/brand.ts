// Brand colors: red, orange and white. Every color that carries white text keeps a contrast
// ratio of at least 4.5:1 with white (WCAG AA for normal text).

export const BRAND = {
  red: "#c62828", // 5.6:1 with white
  redDark: "#b71c1c", // 6.6:1
  orange: "#c2410c", // 5.2:1
  orangeDark: "#9a3412", // 7.3:1
  /** Warm whites for surfaces that sit on colored boards. */
  orangeTint: "#fff3e0",
  warmWhite: "#fff8f3",
} as const;

/** Header bar: red into orange. */
export const BRAND_GRADIENT = `linear-gradient(90deg, ${BRAND.redDark} 0%, ${BRAND.red} 45%, ${BRAND.orange} 100%)`;
