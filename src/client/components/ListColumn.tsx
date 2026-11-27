"use client";

import { useMutation } from "@apollo/client/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import type { BoardCard, BoardList } from "../board-moves";
import { errorMessage, useNotify } from "../notify";
import { ArchiveListMutation, CreateCardMutation, RenameListMutation } from "../operations";
import { SortableCard } from "./CardItem";
import { EditableTitle } from "./EditableTitle";
import { InlineAdd } from "./InlineAdd";

export const LIST_WIDTH = 272;

const columnSx = {
  width: LIST_WIDTH,
  flexShrink: 0,
  bgcolor: "#f1f2f4",
  borderRadius: 3,
  display: "flex",
  flexDirection: "column",
  maxHeight: "100%",
} as const;

export function ListColumn({
  list,
  cardIds,
  cardsById,
  onOpenCard,
}: {
  list: BoardList;
  cardIds: string[];
  cardsById: Map<string, BoardCard>;
  onOpenCard: (id: string) => void;
}) {
  const notify = useNotify();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: `list:${list.id}`,
    data: { type: "list" },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop:${list.id}`,
    data: { type: "drop" },
  });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [renameList] = useMutation(RenameListMutation);
  const [archiveList] = useMutation(ArchiveListMutation);
  const [createCard] = useMutation(CreateCardMutation);

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
      {/* The header is the drag handle for the whole list. */}
      <Stack
        direction="row"
        {...attributes}
        {...listeners}
        aria-label={`Drag list ${list.title}`}
        sx={{ alignItems: "center", px: 1, pt: 1, pb: 0.5, cursor: "grab" }}
      >
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
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              run(archiveList({ variables: { id: list.id } }));
            }}
          >
            Archive this list
          </MenuItem>
        </Menu>
      </Stack>

      <SortableContext
        items={cardIds.map((id) => `card:${id}`)}
        strategy={verticalListSortingStrategy}
      >
        <Stack
          ref={setDropRef}
          spacing={1}
          sx={{ px: 1, py: 0.5, overflowY: "auto", minHeight: 8, flexGrow: 1 }}
        >
          {cardIds.map((id) => {
            const card = cardsById.get(id);
            return card ? <SortableCard key={id} card={card} onOpen={onOpenCard} /> : null;
          })}
        </Stack>
      </SortableContext>

      <Box sx={{ p: 1 }}>
        <InlineAdd
          label="Add a card"
          placeholder="Enter a title for this card"
          submitLabel="Add card"
          onAdd={(title) => run(createCard({ variables: { listId: list.id, title } }))}
        />
      </Box>
    </Box>
  );
}

/** Lightweight copy of a list shown under the pointer while it is dragged. */
export function ListOverlay({ list }: { list: BoardList }) {
  return (
    <Box sx={{ ...columnSx, boxShadow: 6, transform: "rotate(2deg)", p: 1.5 }}>
      <Box sx={{ fontWeight: 700, mb: 1 }}>{list.title}</Box>
      <Box sx={{ color: "text.secondary", fontSize: 14 }}>
        {list.cards.length} card{list.cards.length === 1 ? "" : "s"}
      </Box>
    </Box>
  );
}
