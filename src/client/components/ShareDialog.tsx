"use client";

import { useMutation } from "@apollo/client/react";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
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
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Board } from "../board-moves";
import { errorMessage, useNotify } from "../notify";
import { AddBoardMemberMutation, RemoveBoardMemberMutation } from "../operations";
import { useIsPhone } from "../useIsPhone";
import { userInitial } from "./CardItem";
import { blueOutlinedSx } from "../buttons";

export function ShareDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const notify = useNotify();
  const isPhone = useIsPhone();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addMember, { loading: adding }] = useMutation(AddBoardMemberMutation);
  const [removeMember] = useMutation(RemoveBoardMemberMutation);

  const org = board.project?.workspace;
  const guestIds = new Set(board.guests.map((g) => g.id));
  const orgMembers = board.members.filter((m) => !guestIds.has(m.id));

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addMember({ variables: { boardId: board.id, email: email.trim() } });
      setEmail("");
      notify(`Invited ${email.trim()} as a guest`, "success");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={isPhone}>
      <DialogTitle>Share Board</DialogTitle>
      <DialogContent>
        <Stack component="form" onSubmit={add} direction="row" spacing={1} sx={{ pt: 1 }}>
          <TextField
            autoFocus
            size="small"
            type="email"
            label="Invite Guest by Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!error}
            helperText={
              error ?? "Guests can open only this board. They need to have signed in once."
            }
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
        {org && (
          <Alert severity="info" icon={false} sx={{ mt: 2 }}>
            Everyone in <strong>{org.name}</strong> can open this board.{" "}
            <Link href={`/w/${org.id}/settings`} style={{ color: "inherit" }}>
              Manage Members
            </Link>
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mt: 3 }}>
          Guests ({board.guests.length})
        </Typography>
        {board.guests.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No guests. Invite people from outside {org ? org.name : "the workspace"} above.
          </Typography>
        ) : (
          <List dense>
            {board.guests.map((m) => (
              <PersonRow
                key={m.id}
                person={m}
                onRemove={
                  board.viewerCanManage && m.id !== board.owner.id
                    ? () =>
                        removeMember({ variables: { boardId: board.id, userId: m.id } }).catch(
                          (err) => notify(errorMessage(err)),
                        )
                    : undefined
                }
              />
            ))}
          </List>
        )}

        {orgMembers.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Workspace Members ({orgMembers.length})
            </Typography>
            <List dense>
              {orgMembers.map((m) => (
                <PersonRow key={m.id} person={m} />
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose} sx={blueOutlinedSx}>
          Exit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type Person = Board["members"][number];

function PersonRow({ person, onRemove }: { person: Person; onRemove?: () => void }) {
  return (
    <ListItem
      disableGutters
      secondaryAction={
        onRemove ? (
          <IconButton edge="end" aria-label={`Remove ${person.email}`} onClick={onRemove}>
            <PersonRemoveIcon fontSize="small" />
          </IconButton>
        ) : null
      }
    >
      <ListItemAvatar>
        <Avatar src={person.image ?? undefined}>{userInitial(person)}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={person.name ?? person.email}
        secondary={person.email}
        slotProps={{ secondary: { noWrap: true } }}
      />
    </ListItem>
  );
}
