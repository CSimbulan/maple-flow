"use client";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, type FormEvent } from "react";

/** "+ Add a card" style composer. Stays open after adding so several items can be entered. */
export function InlineAdd({
  label,
  placeholder,
  submitLabel,
  onAdd,
  variant = "light",
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  onAdd: (title: string) => Promise<unknown>;
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        fullWidth
        sx={{
          justifyContent: "flex-start",
          color: variant === "dark" ? "#fff" : "text.secondary",
          bgcolor: variant === "dark" ? "rgba(255,255,255,0.24)" : undefined,
          "&:hover": { bgcolor: variant === "dark" ? "rgba(255,255,255,0.32)" : undefined },
        }}
      >
        {label}
      </Button>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setBusy(true);
    try {
      await onAdd(value);
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack
      component="form"
      onSubmit={submit}
      spacing={1}
      sx={{
        bgcolor: variant === "dark" ? "#f1f2f4" : undefined,
        p: variant === "dark" ? 1 : 0,
        borderRadius: 2,
      }}
    >
      <TextField
        autoFocus
        size="small"
        placeholder={placeholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        slotProps={{ htmlInput: { "aria-label": placeholder, maxLength: 200 } }}
        sx={{ bgcolor: "background.paper" }}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Button type="submit" variant="contained" size="small" disabled={busy || !title.trim()}>
          {submitLabel}
        </Button>
        <IconButton size="small" aria-label="Cancel" onClick={() => setOpen(false)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
