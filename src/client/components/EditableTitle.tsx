"use client";

import InputBase from "@mui/material/InputBase";
import Typography, { type TypographyProps } from "@mui/material/Typography";
import { useState } from "react";

/** Text that turns into an input on click. Saves on Enter or blur; Escape cancels. */
export function EditableTitle({
  value,
  onSave,
  variant = "subtitle1",
  color,
  ariaLabel,
  noWrap = false,
}: {
  value: string;
  onSave: (next: string) => void;
  variant?: TypographyProps["variant"];
  color?: string;
  ariaLabel: string;
  /** Keep to one line, truncating with an ellipsis, instead of wrapping. */
  noWrap?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <Typography
        variant={variant}
        noWrap={noWrap}
        title={noWrap ? value : undefined}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={() => setDraft(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            setDraft(value);
          }
        }}
        // Pointer events pass through so the parent can still be dragged by its title;
        // dnd-kit only starts a drag after the pointer moves, so a plain click edits.
        sx={{
          fontWeight: 700,
          cursor: "text",
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          color,
          overflowWrap: noWrap ? undefined : "anywhere",
        }}
      >
        {value}
      </Typography>
    );
  }

  const commit = () => {
    const next = draft.trim();
    setDraft(null);
    if (next && next !== value) onSave(next);
  };

  return (
    <InputBase
      autoFocus
      fullWidth
      value={draft}
      inputProps={{ "aria-label": ariaLabel, maxLength: 200 }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setDraft(null);
        e.stopPropagation();
      }}
      onFocus={(e) => e.target.select()}
      sx={{
        px: 0.75,
        borderRadius: 1,
        bgcolor: "background.paper",
        fontWeight: 700,
        boxShadow: (t) => `inset 0 0 0 2px ${t.palette.primary.main}`,
      }}
    />
  );
}
