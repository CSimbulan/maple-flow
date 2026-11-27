"use client";

import { useMutation } from "@apollo/client/react";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";
import type { Board, BoardCard } from "../board-moves";
import { errorMessage, useNotify } from "../notify";
import { ArchiveCardMutation, UpdateCardMutation } from "../operations";
import { useDeleteCard } from "../deletes";
import { useIsPhone } from "../useIsPhone";
import { userInitial } from "./CardItem";
import { ConfirmDelete } from "./ConfirmDelete";
import { TagToggle } from "./TagChip";

type Member = Board["members"][number];
type Tag = Board["tags"][number];

export function CardDialog({
  card,
  members,
  tags,
  onClose,
}: {
  card: BoardCard;
  members: Member[];
  /** The board's tags, offered to switch on and off. */
  tags: Tag[];
  onClose: () => void;
}) {
  const notify = useNotify();
  const isPhone = useIsPhone();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [tagIds, setTagIds] = useState<string[]>(card.tags.map((t) => t.id));
  const [dueDate, setDueDate] = useState(card.dueDate?.slice(0, 10) ?? "");
  const [assignees, setAssignees] = useState<Member[]>(
    members.filter((m) => card.assignees.some((a) => a.id === m.id)),
  );
  const [updateCard, { loading: saving }] = useMutation(UpdateCardMutation);
  const [archiveCard, { loading: archiving }] = useMutation(ArchiveCardMutation);
  const [deleteCard, deleting] = useDeleteCard();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await updateCard({
        variables: {
          id: card.id,
          title: title.trim(),
          description,
          // Only tags still on the board (one could be deleted while this is open).
          tagIds: tagIds.filter((id) => tags.some((t) => t.id === id)),
          dueDate: dueDate || null,
          assigneeIds: assignees.map((a) => a.id),
        },
      });
      onClose();
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  async function archive() {
    try {
      await archiveCard({ variables: { id: card.id } });
      onClose();
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  const toggleTag = (id: string) =>
    setTagIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={isPhone}>
      {/* Column layout so that, full screen on phones, the actions sit at the bottom. */}
      <form
        onSubmit={save}
        style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <TextField
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="standard"
            fullWidth
            required
            slotProps={{
              htmlInput: { "aria-label": "Card title", maxLength: 200 },
              input: { sx: { fontSize: 20, fontWeight: 700 } },
            }}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              {tags.length > 0 ? (
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, p: 0.5 }}>
                  {tags.map((tag) => (
                    <TagToggle
                      key={tag.id}
                      tag={tag}
                      selected={tagIds.includes(tag.id)}
                      onToggle={() => toggleTag(tag.id)}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This board has no tags. Add some with Edit tags in the board menu.
                </Typography>
              )}
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 180 }}
              />
              <Autocomplete
                multiple
                fullWidth
                options={members}
                value={assignees}
                onChange={(_e, value) => setAssignees(value)}
                getOptionLabel={(m) => m.name ?? m.email}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderOption={({ key, ...props }, m) => (
                  <li key={key} {...props}>
                    <Avatar
                      src={m.image ?? undefined}
                      sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}
                    >
                      {userInitial(m)}
                    </Avatar>
                    {m.name ?? m.email}
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Assignees" />}
              />
            </Stack>
            <TextField
              label="Description"
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description…"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
          {/* On phones these two show icons only, so all four actions fit on one row. */}
          <Stack direction="row" spacing={0.5}>
            <Button
              startIcon={<ArchiveIcon />}
              color="inherit"
              onClick={archive}
              disabled={archiving}
              aria-label="Archive"
              sx={actionSx}
            >
              <Box component="span" sx={labelSx}>
                Archive
              </Box>
            </Button>
            <Button
              startIcon={<DeleteOutlineIcon />}
              color="error"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete"
              sx={actionSx}
            >
              <Box component="span" sx={labelSx}>
                Delete
              </Box>
            </Button>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving || !title.trim()}>
              Save
            </Button>
          </Stack>
        </DialogActions>
      </form>
      <ConfirmDelete
        open={confirmDelete}
        title={`Delete “${card.title}”?`}
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (await deleteCard(card.id, card.title)) onClose();
        }}
      >
        This permanently deletes the card and its details. It can&apos;t be undone. To hide it but
        keep it, archive it instead.
      </ConfirmDelete>
    </Dialog>
  );
}

// Icon-only on phones, at a 40px touch target.
const actionSx = {
  minWidth: { xs: 40, sm: 0 },
  minHeight: { xs: 40, sm: "auto" },
  "& .MuiButton-startIcon": { mr: { xs: 0, sm: 1 } },
};
const labelSx = { display: { xs: "none", sm: "inline" } };
