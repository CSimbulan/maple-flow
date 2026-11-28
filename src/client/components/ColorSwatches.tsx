"use client";

import CheckIcon from "@mui/icons-material/Check";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";

const SWATCH = 32;
const GAP = 8;

/**
 * A color picker: rounded square swatches with a thin border, in an even grid. The selected one
 * shows a check mark. Every color choice in the app (board backgrounds, list headers, tags)
 * uses this, so they all look the same.
 */
export function ColorSwatches({
  colors,
  value,
  onChange,
  columns = Math.min(colors.length, 5),
  checkColor = "#fff",
}: {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  /** Swatches per row; the grid is exactly this wide. Defaults to up to five. */
  columns?: number;
  /** Color of the check mark on the selected swatch, fixed or per swatch color. */
  checkColor?: string | ((color: string) => string);
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, ${SWATCH}px)`,
        gap: `${GAP}px`,
      }}
    >
      {colors.map((c) => (
        <ButtonBase
          key={c}
          aria-label={`Color ${c}`}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          sx={{
            width: SWATCH,
            height: SWATCH,
            borderRadius: "6px",
            border: "1px solid rgba(0, 0, 0, 0.25)",
            bgcolor: c,
            color: typeof checkColor === "function" ? checkColor(c) : checkColor,
          }}
        >
          {c === value && <CheckIcon fontSize="small" />}
        </ButtonBase>
      ))}
    </Box>
  );
}
