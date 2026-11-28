"use client";

import { useMutation } from "@apollo/client/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddIcon from "@mui/icons-material/Add";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { BoardCard, BoardList } from "../board-moves";
import { useDeleteList } from "../deletes";
import { errorMessage, useNotify } from "../notify";
import { ArchiveListMutation, RenameListMutation, UpdateListColorMutation } from "../operations";
import { BRAND } from "@/brand";
import { LIST_COLORS } from "@/lib/list-colors";
import { SortableCard } from "./CardItem";
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
  onOpenCard,
  onAddCard,
}: {
  list: BoardList;
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
        <Box sx={{ px: 2, py: 1, maxWidth: 220 }}>
          <Typography variant="caption" color="text.secondary">
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
