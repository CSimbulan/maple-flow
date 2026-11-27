"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import SearchIcon from "@mui/icons-material/Search";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { ArchivedCardsQuery as ArchivedCardsData } from "@/gql/graphql";
import type { LabelColor } from "@/server/db/models";
import type { Board } from "../board-moves";
import { LABEL_HEX } from "../colors";
import { errorMessage, useNotify } from "../notify";
import { ArchivedCardsQuery, RestoreCardMutation } from "../operations";
import { useIsPhone } from "../useIsPhone";

type ArchivedCard = NonNullable<ArchivedCardsData["board"]>["archivedCards"][number];
type ActiveList = { id: string; title: string };

/** Archived cards on a board, each with a button to put it back. */
export function ArchivedCardsDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const isPhone = useIsPhone();
  // Cards may have been archived since this was last opened, so always check with the server.
  const { data, loading, error } = useQuery(ArchivedCardsQuery, {
    variables: { id: board.id },
    fetchPolicy: "cache-and-network",
  });
  const [filter, setFilter] = useState("");
  const cards = data?.board?.archivedCards ?? [];
  const needle = filter.trim().toLowerCase();
  const shown = needle ? cards.filter((c) => c.title.toLowerCase().includes(needle)) : cards;
  const activeLists = board.lists.map((l) => ({ id: l.id, title: l.title }));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={isPhone}>
      <DialogTitle>Archived cards</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error.message}</Alert>}
        {loading && !data ? (
          <Stack spacing={1}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={64} />
            ))}
          </Stack>
        ) : cards.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No archived cards. Cards you archive show up here so you can restore them.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {cards.length > 3 && (
              <TextField
                size="small"
                placeholder="Search archived cards"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                slotProps={{
                  htmlInput: { "aria-label": "Search archived cards" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
            {shown.map((card) => (
              <ArchivedCardRow key={card.id} card={card} activeLists={activeLists} />
            ))}
            {shown.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                No archived cards match “{filter.trim()}”.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

function ArchivedCardRow({ card, activeLists }: { card: ArchivedCard; activeLists: ActiveList[] }) {
  const notify = useNotify();
  // A card goes back to its own list; if that list is archived too, the user picks another one.
  const listGone = card.list.archived;
  const [target, setTarget] = useState(listGone ? (activeLists[0]?.id ?? "") : card.list.id);
  const [restore, { loading }] = useMutation(RestoreCardMutation);

  async function onRestore() {
    try {
      const { data } = await restore({
        variables: { id: card.id, listId: listGone ? target : null },
      });
      if (data) notify(`Restored to “${data.restoreCard.list.title}”`, "success");
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Paper
      variant="outlined"
      aria-label={`Archived card ${card.title}`}
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1.5,
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {card.labels.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
            {card.labels.map((l) => (
              <Box
                key={l}
                sx={{ width: 32, height: 6, borderRadius: 3, bgcolor: LABEL_HEX[l as LabelColor] }}
              />
            ))}
          </Stack>
        )}
        <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{card.title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {listGone ? `Its list “${card.list.title}” is archived too` : `From “${card.list.title}”`}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
        {listGone &&
          (activeLists.length > 0 ? (
            <TextField
              select
              size="small"
              label="Restore to"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              sx={{ minWidth: 140, flexGrow: { xs: 1, sm: 0 } }}
            >
              {activeLists.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.title}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Add a list to restore this card into.
            </Typography>
          ))}
        <Button
          variant="contained"
          size="small"
          startIcon={<UnarchiveIcon />}
          onClick={onRestore}
          disabled={loading || !target}
          sx={{ flexShrink: 0 }}
        >
          Restore
        </Button>
      </Stack>
    </Paper>
  );
}
