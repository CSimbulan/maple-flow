"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useState, type FormEvent } from "react";

/** Asks for one name, e.g. for a new organization or project. Closes when `onSubmit` succeeds. */
export function NameDialog({
  title,
  label,
  help,
  submitLabel = "Create",
  onSubmit,
  onClose,
}: {
  title: string;
  label: string;
  help?: string;
  submitLabel?: string;
  onSubmit: (name: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(name.trim());
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {help && <DialogContentText sx={{ mb: 2 }}>{help}</DialogContentText>}
          <TextField
            autoFocus
            fullWidth
            required
            label={label}
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            sx={{ mt: help ? 0 : 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
