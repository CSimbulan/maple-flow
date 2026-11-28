"use client";

import { useMutation } from "@apollo/client/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { BoardCard, BoardList } from "../board-moves";
import { useDeleteList } from "../deletes";
import { errorMessage, useNotify } from "../notify";
import {
  ArchiveListMutation,
  MoveAllCardsMutation,
  RenameListMutation,
  SortListMutation,
  UpdateListColorMutation,
} from "../operations";
import { CARD_SORTS, CARD_SORT_LABELS, type CardSort } from "@/lib/card-sort";
import { BRAND } from "@/brand";
import { LIST_COLORS } from "@/lib/list-colors";
import { cardHasDetails, SortableCard } from "./CardItem";
import { useCollapsedCards } from "../collapsed-cards";
import { DragHandle } from "./DragHandle";
import { ColorSwatches } from "./ColorSwatches";
import { ConfirmDelete } from "./ConfirmDelete";
import { EditableTitle } from "./EditableTitle";

/**
 * On phones a list fills most of the screen with the next one peeking in, and the board snaps
 * to each list when swiped. From `sm` up, lists have a fixed width.
 */
export const listWidthSx = {
  width: { xs: "calc(100vw - 56px)", sm: 272 },
  maxWidth: 320,
  flexShrink: 0,
  scrollSnapAlign: "center",
} as const;

const columnSx = {
  ...listWidthSx,
  bgcolor: BRAND.warmWhite,
  boxShadow: 3,
  borderRadius: 3,
  display: "flex",
  flexDirection: "column",
  maxHeight: "100%",
  // Clips the colored header to the rounded corners; the cards scroll inside.
  overflow: "hidden",
} as const;

export function ListColumn({
  list,
  cardIds,
  cardsById,
  accent,
  otherLists,
  onOpenCard,
  onAddCard,
}: {
  list: BoardList;
  /** The board's other lists, in board order, for Move All Cards. */
  otherLists: { id: string; title: string; color: string }[];
  cardIds: string[];
  cardsById: Map<string, BoardCard>;
  /** The board's color, for the line under each card's title. */
  accent: string;
  onOpenCard: (id: string) => void;
  /** Opens the card dialog to write a new card for this list. */
  onAddCard: () => void;
}) {
  const notify = useNotify();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list:${list.id}`,
    data: { type: "list" },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop:${list.id}`,
    data: { type: "drop" },
  });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [renameList] = useMutation(RenameListMutation);
  const [updateListColor] = useMutation(UpdateListColorMutation);
  const [archiveList] = useMutation(ArchiveListMutation);
  const [sortList] = useMutation(SortListMutation);
  // The sort options open in a second menu, at the same spot as the list menu.
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  // Same for the lists Move All Cards can send the cards to.
  const [moveAnchor, setMoveAnchor] = useState<HTMLElement | null>(null);
  const [moveAllCards] = useMutation(MoveAllCardsMutation);
  const moveAllTo = (target: { id: string; title: string }) => {
    setMoveAnchor(null);
    run(
      moveAllCards({ variables: { fromListId: list.id, toListId: target.id } }).then(({ data }) => {
        const n = data?.moveAllCards.moved ?? 0;
        notify(`Moved ${n} ${n === 1 ? "card" : "cards"} to “${target.title}”`, "success");
      }),
    );
  };
  // Only cards with details can collapse; the two items act on those.
  const collapsedCards = useCollapsedCards();
  const collapsibleIds = list.cards.filter(cardHasDetails).map((c) => c.id);
  const collapsedCount = collapsibleIds.filter((id) => collapsedCards?.collapsed.has(id)).length;
  const collapseAll = (value: boolean) => {
    setMenuAnchor(null);
    collapsedCards?.setMany(collapsibleIds, value);
  };

  const sortBy = (by: CardSort) => {
    setSortAnchor(null);
    run(
      sortList({ variables: { id: list.id, by } }).then(() =>
        notify(`Sorted by ${CARD_SORT_LABELS[by]}`, "success"),
      ),
    );
  };
  const [deleteList, deleting] = useDeleteList();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardCount = list.cards.length;

  const run = (p: Promise<unknown>) => p.catch((err) => notify(errorMessage(err)));

  return (
    <Box
      ref={setNodeRef}
      data-testid="list"
      aria-label={`List ${list.title}`}
      sx={{
        ...columnSx,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", pl: 0.5, pr: 1, py: 0.75, bgcolor: list.color }}
      >
        {/* Only this icon drags the list, so the title and menu work like any other control. */}
        <DragHandle
          label={`Drag list ${list.title}`}
          dragging={isDragging}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
        />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <EditableTitle
            value={list.title}
            ariaLabel="List title"
            variant="body1"
            onSave={(title) =>
              run(
                renameList({
                  variables: { id: list.id, title },
                  optimisticResponse: { renameList: { __typename: "List", id: list.id, title } },
                }),
              )
            }
          />
        </Box>
        <IconButton
          size="small"
          aria-label="List actions"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          disabled={list.cards.length < 2}
          onClick={() => {
            setSortAnchor(menuAnchor);
            setMenuAnchor(null);
          }}
        >
          <ListItemText>Sort Cards</ListItemText>
          <ChevronRightIcon fontSize="small" sx={{ ml: 2, color: "text.secondary" }} />
        </MenuItem>
        <MenuItem
          disabled={list.cards.length === 0 || otherLists.length === 0}
          onClick={() => {
            setMoveAnchor(menuAnchor);
            setMenuAnchor(null);
          }}
        >
          <ListItemText>Move All Cards</ListItemText>
          <ChevronRightIcon fontSize="small" sx={{ ml: 2, color: "text.secondary" }} />
        </MenuItem>
        <MenuItem
          disabled={!collapsedCards || collapsedCount === collapsibleIds.length}
          onClick={() => collapseAll(true)}
        >
          Collapse All Cards
        </MenuItem>
        <MenuItem
          disabled={!collapsedCards || collapsedCount === 0}
          onClick={() => collapseAll(false)}
        >
          Expand All Cards
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            run(archiveList({ variables: { id: list.id } }));
          }}
        >
          Archive List
        </MenuItem>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            setMenuAnchor(null);
            setConfirmDelete(true);
          }}
        >
          Delete List
        </MenuItem>
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          {/* A block with a tight line height, so the space above the label matches the menu's
              side padding instead of growing with the body line height. */}
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ lineHeight: 1 }}
          >
            Header Color
          </Typography>
          <Box sx={{ mt: 1 }}>
            <ColorSwatches
              colors={LIST_COLORS}
              value={list.color}
              checkColor="text.primary"
              onChange={(color) =>
                run(
                  updateListColor({
                    variables: { id: list.id, color },
                    optimisticResponse: {
                      updateListColor: { __typename: "List", id: list.id, color },
                    },
                  }),
                )
              }
            />
          </Box>
        </Box>
      </Menu>
      <Menu
        anchorEl={sortAnchor}
        open={!!sortAnchor}
        onClose={() => setSortAnchor(null)}
        slotProps={{ list: { "aria-label": `Sort cards in ${list.title}` } }}
      >
        <Typography variant="caption" color="text.secondary" component="li" sx={{ px: 2, pb: 0.5 }}>
          Sort Cards by
        </Typography>
        {CARD_SORTS.map((by) => (
          <MenuItem key={by} onClick={() => sortBy(by)}>
            {CARD_SORT_LABELS[by]}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={moveAnchor}
        open={!!moveAnchor}
        onClose={() => setMoveAnchor(null)}
        slotProps={{ list: { "aria-label": `Move all cards in ${list.title} to` } }}
      >
        <Typography variant="caption" color="text.secondary" component="li" sx={{ px: 2, pb: 0.5 }}>
          Move All Cards to
        </Typography>
        {otherLists.map((target) => (
          <MenuItem key={target.id} onClick={() => moveAllTo(target)}>
            {/* The list's header color, to help tell lists apart. */}
            <Box
              aria-hidden
              sx={{
                width: 12,
                height: 12,
                borderRadius: "3px",
                border: "1px solid rgba(0, 0, 0, 0.25)",
                bgcolor: target.color,
                mr: 1.5,
                flexShrink: 0,
              }}
            />
            {target.title}
          </MenuItem>
        ))}
      </Menu>
      <ConfirmDelete
        open={confirmDelete}
        title={`Delete List “${list.title}”?`}
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (await deleteList(list.id, list.title)) setConfirmDelete(false);
        }}
      >
        This permanently deletes the list
        {cardCount > 0 ? ` and its ${cardCount} card${cardCount === 1 ? "" : "s"}` : ""}, along with
        any archived cards from it. It can&apos;t be undone. To hide it but keep it, archive it
        instead.
      </ConfirmDelete>

      <SortableContext
        items={cardIds.map((id) => `card:${id}`)}
        strategy={verticalListSortingStrategy}
      >
        <Stack
          ref={setDropRef}
          spacing={1}
          sx={{ px: 1, pt: 1, pb: 0.5, overflowY: "auto", minHeight: 8, flexGrow: 1 }}
        >
          {cardIds.map((id) => {
            const card = cardsById.get(id);
            return card ? (
              <SortableCard key={id} card={card} accent={accent} onOpen={onOpenCard} />
            ) : null;
          })}
        </Stack>
      </SortableContext>

      <Box sx={{ p: 1 }}>
        <Button
          startIcon={<AddIcon />}
          fullWidth
          onClick={onAddCard}
          sx={{ justifyContent: "flex-start", color: "text.secondary" }}
        >
          Add Card
        </Button>
      </Box>
    </Box>
  );
}

/** Lightweight copy of a list shown under the pointer while it is dragged. */
export function ListOverlay({ list }: { list: BoardList }) {
  return (
    <Box sx={{ ...columnSx, boxShadow: 6, transform: "rotate(2deg)" }}>
      <Box sx={{ fontWeight: 700, px: 1.5, py: 1, bgcolor: list.color }}>{list.title}</Box>
      <Box sx={{ color: "text.secondary", fontSize: 14, px: 1.5, py: 1 }}>
        {list.cards.length} card{list.cards.length === 1 ? "" : "s"}
      </Box>
    </Box>
  );
}
