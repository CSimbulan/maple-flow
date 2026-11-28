"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import SearchIcon from "@mui/icons-material/Search";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import type {
  ArchivedCardsQuery as ArchivedCardsData,
  ArchivedListsQuery as ArchivedListsData,
} from "@/gql/graphql";
import type { Board } from "../board-moves";
import { useDeleteCard, useDeleteList } from "../deletes";
import { errorMessage, useNotify } from "../notify";
import {
  ArchivedCardsQuery,
  ArchivedListsQuery,
  RestoreCardMutation,
  RestoreListMutation,
} from "../operations";
import { useIsPhone } from "../useIsPhone";
import { ConfirmDelete } from "./ConfirmDelete";
import { TagChip } from "./TagChip";
import { blueContainedSx, blueOutlinedSx } from "../buttons";

type ArchivedCard = NonNullable<ArchivedCardsData["board"]>["archivedCards"][number];
type ArchivedList = NonNullable<ArchivedListsData["board"]>["archivedLists"][number];
type ActiveList = { id: string; title: string };
type ArchiveTab = "cards" | "lists";

/** A board's archived cards and lists, in two tabs, each item with a button to put it back. */
export function ArchiveDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const isPhone = useIsPhone();
  const [tab, setTab] = useState<ArchiveTab>("cards");

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={isPhone}>
      <DialogTitle sx={{ pb: 0 }}>Archived Items</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_e, value: ArchiveTab) => setTab(value)}
        sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="cards" label="Cards" />
        <Tab value="lists" label="Lists" />
      </Tabs>
      {/* Only the open tab is mounted, so switching tabs re-fetches it with fresh state. */}
      <DialogContent sx={{ pt: "16px !important" }}>
        {tab === "cards" ? <ArchivedCards board={board} /> : <ArchivedLists board={board} />}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose} sx={blueOutlinedSx}>
          Exit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Cards ----

function ArchivedCards({ board }: { board: Board }) {
  // Items may have been archived since this was last opened, so always check with the server.
  const { data, loading, error } = useQuery(ArchivedCardsQuery, {
    variables: { id: board.id },
    fetchPolicy: "cache-and-network",
  });
  const [filter, setFilter] = useState("");
  const cards = data?.board?.archivedCards ?? [];
  const shown = matching(cards, filter);
  const activeLists = board.lists.map((l) => ({ id: l.id, title: l.title }));

  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (loading && !data) return <LoadingRows />;
  if (cards.length === 0) {
    return (
      <Empty>No archived cards. Cards you archive show up here so you can restore them.</Empty>
    );
  }
  return (
    <Stack spacing={1.5}>
      {cards.length > 3 && <SearchField what="cards" value={filter} onChange={setFilter} />}
      {shown.map((card) => (
        <ArchivedCardRow key={card.id} card={card} activeLists={activeLists} />
      ))}
      {shown.length === 0 && <Empty>No archived cards match “{filter.trim()}”.</Empty>}
    </Stack>
  );
}

function ArchivedCardRow({ card, activeLists }: { card: ArchivedCard; activeLists: ActiveList[] }) {
  const notify = useNotify();
  // A card goes back to its own list; if that list is archived too, the user picks another one.
  const listGone = card.list.archived;
  const [target, setTarget] = useState(listGone ? (activeLists[0]?.id ?? "") : card.list.id);
  const [restore, { loading }] = useMutation(RestoreCardMutation);
  const [deleteCard, deleting] = useDeleteCard();
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    <Row label={`Archived card ${card.title}`}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {card.tags.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mb: 0.5 }}>
            {card.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </Stack>
        )}
        <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{card.title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {listGone
            ? `Its list “${card.list.title}” is archived too (see the Lists tab)`
            : `From “${card.list.title}”`}
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
              Add or restore a list to put this card in.
            </Typography>
          ))}
        <RestoreButton onClick={onRestore} disabled={loading || !target} />
        <DeleteButton what="card" onClick={() => setConfirmDelete(true)} />
      </Stack>
      <ConfirmDelete
        open={confirmDelete}
        title={`Delete “${card.title}”?`}
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteCard(card.id, card.title)}
      >
        This permanently deletes the card and its details. It can&apos;t be undone.
      </ConfirmDelete>
    </Row>
  );
}

// ---- Lists ----

function ArchivedLists({ board }: { board: Board }) {
  const { data, loading, error } = useQuery(ArchivedListsQuery, {
    variables: { id: board.id },
    fetchPolicy: "cache-and-network",
  });
  const [filter, setFilter] = useState("");
  const lists = data?.board?.archivedLists ?? [];
  const shown = matching(lists, filter);

  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (loading && !data) return <LoadingRows />;
  if (lists.length === 0) {
    return (
      <Empty>No archived lists. Lists you archive show up here so you can restore them.</Empty>
    );
  }
  return (
    <Stack spacing={1.5}>
      {lists.length > 3 && <SearchField what="lists" value={filter} onChange={setFilter} />}
      {shown.map((list) => (
        <ArchivedListRow key={list.id} list={list} />
      ))}
      {shown.length === 0 && <Empty>No archived lists match “{filter.trim()}”.</Empty>}
    </Stack>
  );
}

function ArchivedListRow({ list }: { list: ArchivedList }) {
  const notify = useNotify();
  const [restore, { loading }] = useMutation(RestoreListMutation);
  const [deleteList, deleting] = useDeleteList();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = list.cards.length;

  async function onRestore() {
    try {
      const { data } = await restore({ variables: { id: list.id } });
      if (data) notify(`Restored “${data.restoreList.list.title}” to the board`, "success");
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <Row label={`Archived list ${list.title}`}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{list.title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {count === 0
            ? "No cards"
            : count === 1
              ? "1 card comes back with it"
              : `${count} cards come back with it`}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
        <RestoreButton onClick={onRestore} disabled={loading} />
        <DeleteButton what="list" onClick={() => setConfirmDelete(true)} />
      </Stack>
      <ConfirmDelete
        open={confirmDelete}
        title={`Delete List “${list.title}”?`}
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteList(list.id, list.title)}
      >
        This permanently deletes the list
        {count > 0 ? ` and its ${count} card${count === 1 ? "" : "s"}` : ""}, along with any
        archived cards from it. It can&apos;t be undone.
      </ConfirmDelete>
    </Row>
  );
}

// ---- Shared pieces ----

function matching<T extends { title: string }>(items: T[], filter: string): T[] {
  const needle = filter.trim().toLowerCase();
  return needle ? items.filter((i) => i.title.toLowerCase().includes(needle)) : items;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      aria-label={label}
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1.5,
      }}
    >
      {children}
    </Paper>
  );
}

function RestoreButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button
      variant="contained"
      size="small"
      startIcon={<UnarchiveIcon />}
      onClick={onClick}
      disabled={disabled}
      sx={{ ...blueContainedSx, flexShrink: 0 }}
    >
      Restore
    </Button>
  );
}

function DeleteButton({ what, onClick }: { what: "card" | "list"; onClick: () => void }) {
  return (
    <Tooltip title="Delete Permanently">
      <IconButton
        size="small"
        color="error"
        aria-label={`Delete this ${what} permanently`}
        onClick={onClick}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

function SearchField({
  what,
  value,
  onChange,
}: {
  what: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      size="small"
      placeholder={`Search archived ${what}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        htmlInput: { "aria-label": `Search archived ${what}` },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

function LoadingRows() {
  return (
    <Stack spacing={1}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} variant="rounded" height={64} />
      ))}
    </Stack>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
      {children}
    </Typography>
  );
}
