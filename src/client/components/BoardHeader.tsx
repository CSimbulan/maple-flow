"use client";

import { useMutation } from "@apollo/client/react";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "../board-moves";
import { BOARD_BACKGROUNDS } from "../colors";
import { errorMessage, useNotify } from "../notify";
import { DeleteBoardMutation, UpdateBoardMutation } from "../operations";
import { BAR_AVATAR_SX } from "./AppFrame";
import { ArchiveDialog } from "./ArchiveDialog";
import { userInitial } from "./CardItem";
import { ColorSwatches } from "./ColorSwatches";
import { ConfirmDelete } from "./ConfirmDelete";
import { EditableTitle } from "./EditableTitle";
import { ShareDialog } from "./ShareDialog";
import { TagsDialog } from "./TagsDialog";

const breadcrumbLinkSx = {
  color: "inherit",
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
} as const;

export function BoardHeader({ board }: { board: Board }) {
  const notify = useNotify();
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateBoard] = useMutation(UpdateBoardMutation);
  const [deleteBoard, { loading: deleting }] = useMutation(DeleteBoardMutation);
  const projectHref = board.project && `/w/${board.project.workspace.id}/p/${board.project.id}`;

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
        // The project page re-fetches its boards when it opens, so evicting is enough here.
        update(cache) {
          cache.evict({ id: cache.identify({ __typename: "Board", id: board.id }) });
          cache.gc();
        },
      });
      notify(`Deleted “${board.title}”`, "success");
      router.push(projectHref ?? "/boards");
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        px: { xs: 1, sm: 2 },
        py: 1,
        bgcolor: "rgba(0,0,0,0.24)",
        color: "#fff",
      }}
    >
      {/* Takes the free space and truncates long titles instead of wrapping. */}
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        {board.project && projectHref && (
          // Workspace > Project; each part links to its page.
          <Typography
            component="nav"
            aria-label="Board location"
            variant="caption"
            noWrap
            sx={{ display: "block", px: 0.75, color: "rgba(255,255,255,0.85)" }}
          >
            <Box component={Link} href={`/w/${board.project.workspace.id}`} sx={breadcrumbLinkSx}>
              {board.project.workspace.name}
            </Box>
            <Box component="span" aria-hidden sx={{ mx: 0.75 }}>
              &gt;
            </Box>
            <Box component={Link} href={projectHref} sx={breadcrumbLinkSx}>
              {board.project.name}
            </Box>
          </Typography>
        )}
        <Box sx={{ maxWidth: 480 }}>
          <EditableTitle
            value={board.title}
            ariaLabel="Board title"
            variant="h6"
            color="#fff"
            noWrap
            onSave={(title) => update({ title })}
          />
        </Box>
      </Box>
      {/* Members are listed in the share dialog; phones skip the avatar row to save space. */}
      <AvatarGroup
        max={5}
        sx={{
          display: { xs: "none", sm: "flex" },
          // Same look as the account avatar in the top bar. The ring matches the board color so
          // overlapping white avatars stay apart.
          "& .MuiAvatar-root": { ...BAR_AVATAR_SX, borderColor: board.background },
        }}
      >
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
          display: { xs: "none", sm: "inline-flex" },
          flexShrink: 0,
          color: "#fff",
          bgcolor: "rgba(255,255,255,0.2)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
        }}
      >
        Share
      </Button>
      <IconButton
        aria-label="Share board"
        onClick={() => setShareOpen(true)}
        sx={{
          display: { xs: "inline-flex", sm: "none" },
          color: "#fff",
          bgcolor: "rgba(255,255,255,0.2)",
        }}
      >
        <PersonAddIcon fontSize="small" />
      </IconButton>
      <IconButton
        aria-label="Board menu"
        sx={{ color: "#fff" }}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <MoreHorizIcon />
      </IconButton>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setArchivedOpen(true);
          }}
        >
          <ListItemIcon>
            <ArchiveOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Archived Items
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setTagsOpen(true);
          }}
        >
          <ListItemIcon>
            <LocalOfferOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Edit Tags
        </MenuItem>
        <Divider />
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
        {board.viewerCanManage && <Divider />}
        {board.viewerCanManage && (
          <MenuItem
            sx={{ color: "error.main" }}
            onClick={() => {
              setMenuAnchor(null);
              setConfirmDelete(true);
            }}
          >
            Delete Board
          </MenuItem>
        )}
      </Menu>

      {shareOpen && <ShareDialog board={board} onClose={() => setShareOpen(false)} />}
      {archivedOpen && <ArchiveDialog board={board} onClose={() => setArchivedOpen(false)} />}
      {tagsOpen && <TagsDialog board={board} onClose={() => setTagsOpen(false)} />}

      <ConfirmDelete
        open={confirmDelete}
        title={`Delete “${board.title}”?`}
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      >
        This permanently deletes the board with all its lists and cards, for every member. It
        can&apos;t be undone.
      </ConfirmDelete>
    </Stack>
  );
}
