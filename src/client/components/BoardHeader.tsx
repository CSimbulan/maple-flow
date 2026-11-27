"use client";

import { useMutation } from "@apollo/client/react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "../board-moves";
import { BOARD_BACKGROUNDS } from "../colors";
import { errorMessage, useNotify } from "../notify";
import { BoardsQuery, DeleteBoardMutation, UpdateBoardMutation } from "../operations";
import { userInitial } from "./CardItem";
import { ColorSwatches } from "./ColorSwatches";
import { EditableTitle } from "./EditableTitle";
import { ShareDialog } from "./ShareDialog";

export function BoardHeader({ board }: { board: Board }) {
  const notify = useNotify();
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateBoard] = useMutation(UpdateBoardMutation);
  const [deleteBoard, { loading: deleting }] = useMutation(DeleteBoardMutation);

  const update = (vars: { title?: string; background?: string }) =>
    updateBoard({
      variables: { id: board.id, ...vars },
      optimisticResponse: {
        updateBoard: {
          __typename: "Board",
          id: board.id,
          title: vars.title ?? board.title,
          background: vars.background ?? board.background,
        },
      },
    }).catch((err) => notify(errorMessage(err)));

  async function remove() {
    try {
      await deleteBoard({
        variables: { id: board.id },
        update(cache) {
          cache.updateQuery({ query: BoardsQuery }, (prev) =>
            prev ? { boards: prev.boards.filter((b) => b.id !== board.id) } : prev,
          );
          cache.evict({ id: cache.identify({ __typename: "Board", id: board.id }) });
          cache.gc();
        },
      });
      router.push("/boards");
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", px: 2, py: 1, bgcolor: "rgba(0,0,0,0.24)", color: "#fff" }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 480 }}>
        <EditableTitle
          value={board.title}
          ariaLabel="Board title"
          variant="h6"
          color="#fff"
          onSave={(title) => update({ title })}
        />
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 13 } }}>
        {board.members.map((m) => (
          <Tooltip key={m.id} title={m.name ?? m.email}>
            <Avatar src={m.image ?? undefined} alt={m.name ?? m.email}>
              {userInitial(m)}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
      <Button
        startIcon={<PersonAddIcon />}
        onClick={() => setShareOpen(true)}
        sx={{
          color: "#fff",
          bgcolor: "rgba(255,255,255,0.2)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
        }}
      >
        Share
      </Button>
      <IconButton
        aria-label="Board menu"
        sx={{ color: "#fff" }}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <MoreHorizIcon />
      </IconButton>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <Box sx={{ px: 2, py: 1, maxWidth: 220 }}>
          <Typography variant="caption" color="text.secondary">
            Background
          </Typography>
          <Box sx={{ mt: 1 }}>
            <ColorSwatches
              colors={BOARD_BACKGROUNDS}
              value={board.background}
              onChange={(background) => update({ background })}
            />
          </Box>
        </Box>
        {board.viewerIsOwner && <Divider />}
        {board.viewerIsOwner && (
          <MenuItem
            sx={{ color: "error.main" }}
            onClick={() => {
              setMenuAnchor(null);
              setConfirmDelete(true);
            }}
          >
            Delete board…
          </MenuItem>
        )}
      </Menu>

      {shareOpen && <ShareDialog board={board} onClose={() => setShareOpen(false)} />}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete “{board.title}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently deletes the board with all its lists and cards, for every member. It
            can&apos;t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} disabled={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
