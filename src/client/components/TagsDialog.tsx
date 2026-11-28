"use client";

import { useMutation } from "@apollo/client/react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";
import { TAG_COLORS, tagTextColor } from "@/lib/tags";
import type { Board } from "../board-moves";
import { blueOutlinedSx } from "../buttons";
import { errorMessage, useNotify } from "../notify";
import { CreateTagMutation, DeleteTagMutation, UpdateTagMutation } from "../operations";
import { useIsPhone } from "../useIsPhone";
import { ColorSwatches } from "./ColorSwatches";
import { ConfirmDelete } from "./ConfirmDelete";
import { TagChip } from "./TagChip";

type Tag = Board["tags"][number];

/**
 * One tag row. From `sm` up: preview and palette, name, then the action (delete or Add) on one
 * line. On phones the preview and palette move under the name, and the action sits beside both
 * lines, centered between them.
 */
const rowSx = {
  display: "grid",
  alignItems: "center",
  columnGap: 1,
  rowGap: 1,
  gridTemplateColumns: { xs: "1fr auto", sm: "auto 1fr auto" },
  gridTemplateAreas: { xs: `"name action" "look action"`, sm: `"look name action"` },
} as const;
const lookSx = { gridArea: "look", display: "flex", alignItems: "center", gap: 1 } as const;
// A fixed width from `sm` up keeps the name fields lined up whatever the tag names are.
const chipBoxSx = { width: { sm: 120 }, minWidth: 0 } as const;

/** The board's tags: rename, recolor, delete, and add new ones. Changes save right away. */
export function TagsDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const isPhone = useIsPhone();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={isPhone}>
      <DialogTitle>Tags</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tags on this board, for everyone who can open it. Pick them on a card to label it.
        </Typography>
        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {board.tags.map((tag) => (
            <TagRow key={tag.id} boardId={board.id} tag={tag} />
          ))}
          <NewTag boardId={board.id} count={board.tags.length} />
        </Stack>
      </DialogContent>
      {/* Tag changes save as they're made, so both buttons just close the dialog. */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {/* Tag edits save as they're made, so this only closes the dialog. */}
        <Button variant="outlined" onClick={onClose} sx={blueOutlinedSx}>
          Exit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TagRow({ boardId, tag }: { boardId: string; tag: Tag }) {
  const notify = useNotify();
  const [name, setName] = useState(tag.name);
  const [updateTag] = useMutation(UpdateTagMutation);
  const [deleteTag, { loading: deleting }] = useMutation(DeleteTagMutation);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = (vars: { name?: string; color?: string }) =>
    updateTag({ variables: { boardId, tagId: tag.id, ...vars } }).catch((err) => {
      notify(errorMessage(err));
      setName(tag.name);
    });

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed) setName(tag.name);
    else if (trimmed !== tag.name) void save({ name: trimmed });
  }

  async function remove() {
    try {
      await deleteTag({ variables: { boardId, tagId: tag.id } });
      setConfirmDelete(false);
      notify(`Deleted tag “${tag.name}”`, "success");
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Box>
      <Box sx={rowSx}>
        <Box sx={lookSx}>
          <Box sx={chipBoxSx}>
            <TagChip tag={{ name: name.trim() || tag.name, color: tag.color }} />
          </Box>
          <ColorButton
            label={`Color of tag ${tag.name}`}
            value={tag.color}
            onChange={(color) => color !== tag.color && void save({ color })}
          />
        </Box>
        <TextField
          size="small"
          fullWidth
          sx={{ gridArea: "name" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setName(tag.name);
          }}
          slotProps={{ htmlInput: { "aria-label": `Name of tag ${tag.name}`, maxLength: 40 } }}
        />
        <IconButton
          aria-label={`Delete tag ${tag.name}`}
          onClick={() => setConfirmDelete(true)}
          sx={{ gridArea: "action" }}
        >
          <DeleteOutlineIcon />
        </IconButton>
      </Box>
      <ConfirmDelete
        open={confirmDelete}
        title={`Delete Tag “${tag.name}”?`}
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        It&apos;s removed from this board and from every card that has it. This can&apos;t be
        undone.
      </ConfirmDelete>
    </Box>
  );
}

function NewTag({ boardId, count }: { boardId: string; count: number }) {
  const notify = useNotify();
  const [name, setName] = useState("");
  // Suggest a color in turn, so new tags don't all start out the same.
  const [picked, setPicked] = useState<string | null>(null);
  const color = picked ?? TAG_COLORS[count % TAG_COLORS.length];
  const [createTag, { loading }] = useMutation(CreateTagMutation);

  async function add(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createTag({ variables: { boardId, name: trimmed, color } });
      setName("");
      setPicked(null);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Box component="form" onSubmit={add}>
      <Typography variant="subtitle2" gutterBottom>
        New Tag
      </Typography>
      <Box sx={rowSx}>
        <Box sx={lookSx}>
          <Box sx={chipBoxSx}>
            <TagChip tag={{ name: name.trim() || "Preview", color }} />
          </Box>
          <ColorButton label="Color of the new tag" value={color} onChange={setPicked} />
        </Box>
        <TextField
          size="small"
          fullWidth
          sx={{ gridArea: "name" }}
          placeholder="Tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { "aria-label": "New tag name", maxLength: 40 } }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !name.trim()}
          sx={{ gridArea: "action" }}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
}

/** Palette icon that opens a small grid of tag colors; picking one closes it. */
function ColorButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title="Change Color">
        <IconButton
          aria-label={label}
          aria-haspopup="dialog"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ flexShrink: 0 }}
        >
          <PaletteOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { role: "dialog", "aria-label": label } }}
      >
        <Box sx={{ p: 1.5 }}>
          <ColorSwatches
            colors={TAG_COLORS}
            columns={3}
            value={value}
            checkColor={tagTextColor}
            onChange={(color) => {
              setAnchor(null);
              onChange(color);
            }}
          />
        </Box>
      </Popover>
    </>
  );
}
