"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { tagTextColor } from "@/lib/tags";

type Tag = { name: string; color: string };

const chipSx = (color: string) =>
  ({
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    px: 1,
    height: 24,
    borderRadius: 12,
    border: `1px solid ${color}`,
    bgcolor: color,
    color: tagTextColor(color),
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }) as const;

/** A tag as it shows on a card: a pill in the tag's color, with white or black text. */
export function TagChip({ tag }: { tag: Tag }) {
  return (
    <Box component="span" sx={chipSx(tag.color)}>
      {tag.name}
    </Box>
  );
}

/** A tag that can be switched on and off (card dialog). Off tags are faded. */
export function TagToggle({
  tag,
  selected,
  onToggle,
}: {
  tag: Tag;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <ButtonBase
      aria-pressed={selected}
      onClick={onToggle}
      sx={{
        ...chipSx(tag.color),
        height: 32,
        px: 1.5,
        borderRadius: 16,
        fontSize: 14,
        opacity: selected ? 1 : 0.4,
        outline: selected ? "2px solid" : "none",
        outlineColor: "text.primary",
        outlineOffset: 2,
        "&:hover": { opacity: selected ? 1 : 0.6 },
        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" },
      }}
    >
      {tag.name}
    </ButtonBase>
  );
}
