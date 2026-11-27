"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  columnsOf,
  listOfCard,
  neighbors,
  optimisticMoveCard,
  optimisticMoveList,
  type Board,
  type BoardCard,
  type Columns,
} from "../board-moves";
import { errorMessage, useNotify } from "../notify";
import {
  BoardDetailQuery,
  CreateListMutation,
  MoveCardMutation,
  MoveListMutation,
} from "../operations";
import { BoardHeader } from "./BoardHeader";
import { CardDialog } from "./CardDialog";
import { CardFace } from "./CardItem";
import { InlineAdd } from "./InlineAdd";
import { LIST_WIDTH, ListColumn, ListOverlay } from "./ListColumn";

type DndKind = "card" | "list" | "drop";

/** dnd-kit ids are prefixed ("card:<id>", "list:<id>", "drop:<listId>") so the kinds can't collide. */
function parseId(id: string | number): { kind: DndKind; id: string } {
  const [kind, rest] = String(id).split(":") as [DndKind, string];
  return { kind, id: rest };
}

/** Lists only collide with lists; cards collide with cards and list drop zones (for empty lists). */
const collisionDetection: CollisionDetection = (args) => {
  const kind = parseId(args.active.id).kind;
  if (kind === "list") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => parseId(c.id).kind === "list"),
    });
  }
  const targets = args.droppableContainers.filter((c) => parseId(c.id).kind !== "list");
  const hits = pointerWithin({ ...args, droppableContainers: targets });
  return hits.length > 0 ? hits : closestCorners({ ...args, droppableContainers: targets });
};

export function BoardView({ boardId }: { boardId: string }) {
  const { data, loading, error } = useQuery(BoardDetailQuery, { variables: { id: boardId } });

  if (loading && !data) {
    return (
      <Stack direction="row" spacing={1.5} sx={{ p: 2 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" width={LIST_WIDTH} height={240} />
        ))}
      </Stack>
    );
  }
  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    );
  if (!data?.board) {
    return (
      <Alert
        severity="info"
        sx={{ m: 2 }}
        action={
          <Button component={Link} href="/boards" color="inherit" size="small">
            Your boards
          </Button>
        }
      >
        This board doesn&apos;t exist or you don&apos;t have access to it.
      </Alert>
    );
  }
  return <BoardCanvas board={data.board} />;
}

function BoardCanvas({ board }: { board: Board }) {
  const notify = useNotify();
  const [moveCard] = useMutation(MoveCardMutation);
  const [moveList] = useMutation(MoveListMutation);
  const [createList] = useMutation(CreateListMutation);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  // While dragging, the order lives in local state; otherwise it comes straight from the cache.
  const [drag, setDrag] = useState<{ kind: "card" | "list"; id: string; columns: Columns } | null>(
    null,
  );
  const columns = drag?.columns ?? columnsOf(board);

  const listsById = useMemo(() => new Map(board.lists.map((l) => [l.id, l])), [board.lists]);
  const cardsById = useMemo(
    () => new Map<string, BoardCard>(board.lists.flatMap((l) => l.cards.map((c) => [c.id, c]))),
    [board.lists],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart({ active }: DragStartEvent) {
    const { kind, id } = parseId(active.id);
    if (kind === "card" || kind === "list") setDrag({ kind, id, columns: columnsOf(board) });
  }

  // Moving a card into another list happens during the drag, so the target list makes room.
  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = parseId(active.id);
    if (activeId.kind !== "card") return;
    const target = parseId(over.id);
    setDrag((d) => {
      if (!d) return d;
      const from = listOfCard(d.columns, activeId.id);
      const to = target.kind === "card" ? listOfCard(d.columns, target.id) : target.id;
      if (!from || !to || from === to || !d.columns.cards[to]) return d;
      const toCards = [...d.columns.cards[to]];
      const index = target.kind === "card" ? toCards.indexOf(target.id) : toCards.length;
      toCards.splice(index, 0, activeId.id);
      return {
        ...d,
        columns: {
          ...d.columns,
          cards: {
            ...d.columns.cards,
            [from]: d.columns.cards[from].filter((c) => c !== activeId.id),
            [to]: toCards,
          },
        },
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const current = drag;
    setDrag(null);
    if (!current || !over) return;
    const target = parseId(over.id);

    if (current.kind === "list") {
      const order = current.columns.listIds;
      const from = order.indexOf(current.id);
      const to = target.kind === "list" ? order.indexOf(target.id) : -1;
      if (to === -1 || from === to) return;
      const { beforeId, afterId } = neighbors(arrayMove(order, from, to), current.id);
      moveList({
        variables: { id: current.id, beforeId, afterId },
        optimisticResponse: optimisticMoveList(board, current.id, beforeId, afterId),
      }).catch((err) => notify(errorMessage(err)));
      return;
    }

    const cardId = parseId(active.id).id;
    const listId = listOfCard(current.columns, cardId);
    if (!listId) return;
    let ids = current.columns.cards[listId];
    if (target.kind === "card" && target.id !== cardId && ids.includes(target.id)) {
      ids = arrayMove(ids, ids.indexOf(cardId), ids.indexOf(target.id));
    }
    const { beforeId, afterId } = neighbors(ids, cardId);
    const original = board.lists.find((l) => l.cards.some((c) => c.id === cardId));
    const unchanged =
      original?.id === listId &&
      JSON.stringify(
        neighbors(
          original.cards.map((c) => c.id),
          cardId,
        ),
      ) === JSON.stringify({ beforeId, afterId });
    if (unchanged) return;
    moveCard({
      variables: { id: cardId, toListId: listId, beforeId, afterId },
      optimisticResponse: optimisticMoveCard(board, cardId, listId, beforeId, afterId),
    }).catch((err) => notify(errorMessage(err)));
  }

  const activeCard = drag?.kind === "card" ? cardsById.get(drag.id) : undefined;
  const activeList = drag?.kind === "list" ? listsById.get(drag.id) : undefined;
  const openCard = openCardId ? cardsById.get(openCardId) : undefined;

  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: board.background,
      }}
    >
      <BoardHeader board={board} />
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDrag(null)}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ flexGrow: 1, minHeight: 0, overflowX: "auto", p: 1.5, alignItems: "flex-start" }}
        >
          <SortableContext
            items={columns.listIds.map((id) => `list:${id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.listIds.map((id) => {
              const list = listsById.get(id);
              return list ? (
                <ListColumn
                  key={id}
                  list={list}
                  cardIds={columns.cards[id] ?? []}
                  cardsById={cardsById}
                  onOpenCard={setOpenCardId}
                />
              ) : null;
            })}
          </SortableContext>
          <Box sx={{ width: LIST_WIDTH, flexShrink: 0 }}>
            <InlineAdd
              variant="dark"
              label={board.lists.length ? "Add another list" : "Add a list"}
              placeholder="Enter list title"
              submitLabel="Add list"
              onAdd={(title) =>
                createList({ variables: { boardId: board.id, title } }).catch((err) =>
                  notify(errorMessage(err)),
                )
              }
            />
          </Box>
        </Stack>
        <DragOverlay>
          {activeCard ? (
            <Box sx={{ width: LIST_WIDTH - 16 }}>
              <CardFace card={activeCard} dragging />
            </Box>
          ) : activeList ? (
            <ListOverlay list={activeList} />
          ) : null}
        </DragOverlay>
      </DndContext>
      {openCard && (
        <CardDialog card={openCard} members={board.members} onClose={() => setOpenCardId(null)} />
      )}
    </Box>
  );
}
