"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import NotesIcon from "@mui/icons-material/Notes";
import ScheduleIcon from "@mui/icons-material/Schedule";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { BoardCard } from "../board-moves";
import { TagChip } from "./TagChip";

/** Long-pressing to drag on touch screens shouldn't select text or open the callout menu. */
export const noTouchSelectSx = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
} as const;

export function formatDue(iso: string) {
  // Due dates are stored as UTC midnight; show the calendar date regardless of local time zone.
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function userInitial(u: { name: string | null; email: string }) {
  return (u.name ?? u.email).slice(0, 1).toUpperCase();
}

/** Visual card, shared by the sortable item and the drag overlay. */
export function CardFace({ card, dragging }: { card: BoardCard; dragging?: boolean }) {
  return (
    <Paper
      elevation={dragging ? 6 : 1}
      sx={{
        p: 1.25,
        cursor: "pointer",
        transform: dragging ? "rotate(3deg)" : undefined,
        "&:hover": { boxShadow: (t) => `inset 0 0 0 2px ${t.palette.primary.main}` },
      }}
    >
      {card.tags.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mb: 0.75 }}>
          {card.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </Stack>
      )}
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
        {card.title}
      </Typography>
      {(card.description || card.dueDate || card.assignees.length > 0) && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", mt: 0.75, color: "text.secondary" }}
        >
          {card.dueDate && (
            <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
              <ScheduleIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption">{formatDue(card.dueDate)}</Typography>
            </Stack>
          )}
          {card.description && <NotesIcon sx={{ fontSize: 14 }} aria-label="Has description" />}
          <Box sx={{ flexGrow: 1 }} />
          {card.assignees.length > 0 && (
            <AvatarGroup
              max={3}
              sx={{ "& .MuiAvatar-root": { width: 22, height: 22, fontSize: 11 } }}
            >
              {card.assignees.map((u) => (
                <Avatar key={u.id} src={u.image ?? undefined} alt={u.name ?? u.email}>
                  {userInitial(u)}
                </Avatar>
              ))}
            </AvatarGroup>
          )}
        </Stack>
      )}
    </Paper>
  );
}

export function SortableCard({ card, onOpen }: { card: BoardCard; onOpen: (id: string) => void }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card" },
  });
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid="card"
      aria-label={`Card ${card.title}`}
      onClick={() => onOpen(card.id)}
      onKeyDown={(e) => {
        // Space starts a keyboard drag (dnd-kit); Enter opens the card.
        if (e.key === "Enter") onOpen(card.id);
        listeners?.onKeyDown?.(e);
      }}
      sx={{
        ...noTouchSelectSx,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <CardFace card={card} />
    </Box>
  );
}
