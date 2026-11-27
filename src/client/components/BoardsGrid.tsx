"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
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
import { useState, type FormEvent } from "react";
import { BRAND } from "@/brand";
import { BOARD_BACKGROUNDS } from "../colors";
import { errorMessage, useNotify } from "../notify";
import { BoardsQuery, CreateBoardMutation } from "../operations";
import { ColorSwatches } from "./ColorSwatches";

const tileSx = {
  height: { xs: 80, sm: 96 },
  borderRadius: 2,
  p: 1.5,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
} as const;

export function BoardsGrid() {
  const { data, loading, error } = useQuery(BoardsQuery);
  const [open, setOpen] = useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Your boards
      </Typography>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          // Two columns on phones, more as the screen widens.
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(auto-fill, minmax(200px, 1fr))",
          },
          mt: 2,
        }}
      >
        {loading && !data
          ? [0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" sx={{ height: tileSx.height }} />
            ))
          : data?.boards.map((b) => (
              <ButtonBase
                key={b.id}
                component={Link}
                href={`/b/${b.id}`}
                sx={{
                  ...tileSx,
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
                    // Long titles stop at two lines so they stay inside the tile.
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {b.title}
                </Typography>
              </ButtonBase>
            ))}
        <ButtonBase
          onClick={() => setOpen(true)}
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
          <Typography>Create new board</Typography>
        </ButtonBase>
      </Box>
      {open && <CreateBoardDialog onClose={() => setOpen(false)} />}
    </Container>
  );
}

function CreateBoardDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const notify = useNotify();
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState(BOARD_BACKGROUNDS[0]);
  const [createBoard, { loading }] = useMutation(CreateBoardMutation, {
    update(cache, { data }) {
      if (!data) return;
      cache.updateQuery({ query: BoardsQuery }, (prev) =>
        prev ? { boards: [data.createBoard, ...prev.boards] } : prev,
      );
    },
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const { data } = await createBoard({ variables: { title, background } });
      if (data) router.push(`/b/${data.createBoard.id}`);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>Create board</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box sx={{ height: 80, borderRadius: 2, bgcolor: background }} />
            <TextField
              autoFocus
              label="Board title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            <ColorSwatches colors={BOARD_BACKGROUNDS} value={background} onChange={setBackground} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!title.trim() || loading}>
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
