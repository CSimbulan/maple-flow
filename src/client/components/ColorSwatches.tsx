"use client";

import CheckIcon from "@mui/icons-material/Check";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";

export function ColorSwatches({
  colors,
  value,
  onChange,
  checkColor = "#fff",
}: {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  /** Color of the check mark on the selected swatch; use a dark one for light swatches. */
  checkColor?: string;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
      {colors.map((c) => (
        <ButtonBase
          key={c}
          aria-label={`Color ${c}`}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          sx={{ width: 36, height: 28, borderRadius: 1, bgcolor: c, color: checkColor }}
        >
          {c === value && <CheckIcon fontSize="small" />}
        </ButtonBase>
      ))}
    </Stack>
  );
}
