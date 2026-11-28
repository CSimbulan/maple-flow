"use client";

import { useMutation } from "@apollo/client/react";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { blueContainedSx, blueOutlinedSx } from "../buttons";
import { useState, type FormEvent, type ReactNode } from "react";
import { BRAND } from "@/brand";
import { BOARD_BACKGROUNDS } from "../colors";
import { errorMessage, useNotify } from "../notify";
import { CreateBoardMutation } from "../operations";
import { ColorSwatches } from "./ColorSwatches";

/** A board tile: its title, and optionally a few short lines of context under it. */
type Tile = { id: string; title: string; background: string; caption?: string[] };

export const tileSx = {
  height: { xs: 80, sm: 96 },
  borderRadius: 2,
  p: 1.5,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
} as const;

/** Responsive grid: two columns on phones, more as the screen widens. */
export function TileGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(auto-fill, minmax(200px, 1fr))",
        },
      }}
    >
      {children}
    </Box>
  );
}

/** Dashed "+ New …" tile. */
export function AddTile({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        ...tileSx,
        bgcolor: BRAND.orangeTint,
        color: BRAND.orangeDark,
        border: "1px dashed",
        borderColor: "secondary.main",
        "&:hover": { bgcolor: "#ffe0b2" },
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
      }}
    >
      <AddIcon fontSize="small" />
      <Typography>{label}</Typography>
    </ButtonBase>
  );
}

/** A project's boards as colored tiles, plus a tile to create one in `projectId`. */
export function BoardTiles({
  boards,
  loading,
  projectId,
}: {
  boards: Tile[];
  loading?: boolean;
  projectId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <TileGrid>
      {loading
        ? [0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: tileSx.height }} />
          ))
        : boards.map((b) => (
            <ButtonBase
              key={b.id}
              component={Link}
              href={`/b/${b.id}`}
              sx={{
                ...tileSx,
                // With a caption, grow past the usual height rather than overlap the title.
                ...(b.caption?.length && { height: "auto", minHeight: tileSx.height, gap: 1 }),
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "stretch",
                bgcolor: b.background,
                color: "#fff",
                "&:hover": { filter: "brightness(0.92)" },
              }}
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  textAlign: "left",
                  overflowWrap: "anywhere",
                  // Long titles stop at two lines (one with a caption) so they stay inside the tile.
                  display: "-webkit-box",
                  WebkitLineClamp: b.caption?.length ? 1 : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {b.title}
              </Typography>
              {b.caption && b.caption.length > 0 && (
                <Box sx={{ textAlign: "left", opacity: 0.9, minWidth: 0 }}>
                  {b.caption.map((line) => (
                    <Typography key={line} variant="caption" noWrap component="p">
                      {line}
                    </Typography>
                  ))}
                </Box>
              )}
            </ButtonBase>
          ))}
      {projectId && <AddTile label="Create New Board" onClick={() => setOpen(true)} />}
      {open && projectId && (
        <CreateBoardDialog projectId={projectId} onClose={() => setOpen(false)} />
      )}
    </TileGrid>
  );
}

function CreateBoardDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const router = useRouter();
  const notify = useNotify();
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState(BOARD_BACKGROUNDS[0]);
  // The response includes the project's boards, so the project page updates by itself.
  const [createBoard, { loading }] = useMutation(CreateBoardMutation);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const { data } = await createBoard({ variables: { projectId, title, background } });
      if (data) router.push(`/b/${data.createBoard.id}`);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>Create Board</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box sx={{ height: 80, borderRadius: 2, bgcolor: background }} />
            <TextField
              autoFocus
              label="Board Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            <ColorSwatches
              colors={BOARD_BACKGROUNDS}
              columns={4}
              value={background}
              onChange={setBackground}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" onClick={onClose} sx={blueOutlinedSx}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={blueContainedSx}
            disabled={!title.trim() || loading}
          >
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
