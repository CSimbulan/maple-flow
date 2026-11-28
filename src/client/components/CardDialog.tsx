"use client";

import { useMutation } from "@apollo/client/react";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import MenuItem from "@mui/material/MenuItem";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";
import type { Board, BoardCard } from "../board-moves";
import { blueContainedSx, blueOutlinedSx } from "../buttons";
import { errorMessage, useNotify } from "../notify";
import { ArchiveCardMutation, CreateCardMutation, UpdateCardMutation } from "../operations";
import { useDeleteCard } from "../deletes";
import { useIsPhone } from "../useIsPhone";
import { CardFeed } from "./CardFeed";
import { userInitial } from "./CardItem";
import { ConfirmDelete } from "./ConfirmDelete";
import { PriorityIcon } from "./PriorityIcon";
import { TagToggle } from "./TagChip";

type Member = Board["members"][number];
type Tag = Board["tags"][number];

/**
 * Card editor. Pass `card` to edit one, or `newInList` to write a new card for that list: the
 * same fields, created on Save ("Add card"), without archive or delete.
 */
export function CardDialog({
  card,
  newInList,
  members,
  tags,
  onClose,
}: {
  members: Member[];
  /** The board's tags, offered to switch on and off. */
  tags: Tag[];
  onClose: () => void;
} & (
  | { card: BoardCard; newInList?: undefined }
  | { card?: undefined; newInList: { id: string; title: string } }
)) {
  const notify = useNotify();
  const isPhone = useIsPhone();
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [tagIds, setTagIds] = useState<string[]>(card?.tags.map((t) => t.id) ?? []);
  const [dueDate, setDueDate] = useState(card?.dueDate?.slice(0, 10) ?? "");
  // "" is "no priority" in the select; it's sent as null.
  const [priority, setPriority] = useState<Priority | "">(card?.priority ?? "");
  const [assignees, setAssignees] = useState<Member[]>(
    members.filter((m) => card?.assignees.some((a) => a.id === m.id)),
  );
  const [updateCard, { loading: updating }] = useMutation(UpdateCardMutation);
  const [createCard, { loading: creating }] = useMutation(CreateCardMutation);
  const saving = updating || creating;
  const [archiveCard, { loading: archiving }] = useMutation(ArchiveCardMutation);
  const [deleteCard, deleting] = useDeleteCard();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const details = {
      title: title.trim(),
      description,
      // Only tags still on the board (one could be deleted while this is open).
      tagIds: tagIds.filter((id) => tags.some((t) => t.id === id)),
      dueDate: dueDate || null,
      priority: priority || null,
      assigneeIds: assignees.map((a) => a.id),
    };
    try {
      if (card) await updateCard({ variables: { id: card.id, ...details } });
      else await createCard({ variables: { listId: newInList.id, ...details } });
      onClose();
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  async function archive() {
    if (!card) return;
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
          {newInList && (
            <Typography variant="caption" color="text.secondary" component="p">
              New Card in “{newInList.title}”
            </Typography>
          )}
          <TextField
            autoFocus={!card}
            placeholder={card ? undefined : "Card title"}
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
                  This board has no tags. Add some with Edit Tags in the board menu.
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                // MUI links a select to its label only through an id; without one it has no name.
                id="card-priority"
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority | "")}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: (value) => <PriorityOption priority={value as Priority | ""} />,
                  },
                  inputLabel: { shrink: true },
                }}
                sx={{ flex: 1, minWidth: 0 }}
              >
                <MenuItem value="">
                  <PriorityOption priority="" />
                </MenuItem>
                {PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    <PriorityOption priority={p} />
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1, minWidth: 0 }}
              />
            </Stack>
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
            <TextField
              label="Description"
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description…"
              fullWidth
            />
            {/* Only saved cards have comments and activity. */}
            {card && <CardFeed cardId={card.id} />}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: card ? "space-between" : "flex-end", px: 3, pb: 2 }}>
          {/* On phones these two show icons only, so all four actions fit on one row. */}
          {card && (
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
                variant="contained"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete"
                sx={actionSx}
              >
                <Box component="span" sx={labelSx}>
                  Delete
                </Box>
              </Button>
            </Stack>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={onClose} sx={blueOutlinedSx}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !title.trim()}
              sx={blueContainedSx}
            >
              {card ? "Save" : "Add Card"}
            </Button>
          </Stack>
        </DialogActions>
      </form>
      {card && (
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
      )}
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

/** A priority's icon and name, as shown in the select (or "None"). */
function PriorityOption({ priority }: { priority: Priority | "" }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {priority ? (
        <PriorityIcon priority={priority} decorative />
      ) : (
        <Box sx={{ width: 20 }} aria-hidden />
      )}
      <span>{priority ? PRIORITY_LABELS[priority] : "None"}</span>
    </Stack>
  );
}
