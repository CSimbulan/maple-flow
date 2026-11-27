"use client";

import { useMutation } from "@apollo/client/react";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";
import type { Board } from "../board-moves";
import { errorMessage, useNotify } from "../notify";
import { AddBoardMemberMutation, RemoveBoardMemberMutation } from "../operations";
import { userInitial } from "./CardItem";

export function ShareDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const notify = useNotify();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addMember, { loading: adding }] = useMutation(AddBoardMemberMutation);
  const [removeMember] = useMutation(RemoveBoardMemberMutation);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addMember({ variables: { boardId: board.id, email: email.trim() } });
      setEmail("");
      notify("Member added", "success");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share board</DialogTitle>
      <DialogContent>
        <Stack component="form" onSubmit={add} direction="row" spacing={1} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            size="small"
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!error}
            helperText={error ?? "They need to have signed in to Maple Flow once."}
            fullWidth
            required
          />
          <Button
            type="submit"
            variant="contained"
            disabled={adding || !email.trim()}
            sx={{ alignSelf: "flex-start", height: 40 }}
          >
            Add
          </Button>
        </Stack>
        <Typography variant="subtitle2" sx={{ mt: 3 }}>
          Members
        </Typography>
        <List dense>
          {board.members.map((m) => {
            const isOwner = m.id === board.owner.id;
            return (
              <ListItem
                key={m.id}
                secondaryAction={
                  isOwner ? (
                    <Chip size="small" label="Owner" />
                  ) : board.viewerIsOwner ? (
                    <IconButton
                      edge="end"
                      aria-label={`Remove ${m.email}`}
                      onClick={() =>
                        removeMember({ variables: { boardId: board.id, userId: m.id } }).catch(
                          (err) => notify(errorMessage(err)),
                        )
                      }
                    >
                      <PersonRemoveIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar src={m.image ?? undefined}>{userInitial(m)}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={m.name ?? m.email} secondary={m.email} />
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
