"use client";

import CheckIcon from "@mui/icons-material/Check";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";

export function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
      {colors.map((c) => (
        <ButtonBase
          key={c}
          aria-label={`Color ${c}`}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
          sx={{ width: 36, height: 28, borderRadius: 1, bgcolor: c, color: "#fff" }}
        >
          {c === value && <CheckIcon fontSize="small" />}
        </ButtonBase>
      ))}
    </Stack>
  );
}
