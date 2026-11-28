"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AvatarGroup from "@mui/material/AvatarGroup";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { BoardCard } from "../board-moves";
import { useCardCollapsed } from "../collapsed-cards";
import { DragHandle } from "./DragHandle";
import { PriorityIcon } from "./PriorityIcon";
import { TagChip } from "./TagChip";
import { UserAvatar } from "./UserAvatar";

export function formatDue(iso: string) {
  // Due dates are stored as UTC midnight; show the calendar date regardless of local time zone.
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Whether a card shows anything below its title, i.e. whether it can be collapsed. */
export function cardHasDetails(
  card: Pick<BoardCard, "description" | "tags" | "dueDate" | "assignees">,
): boolean {
  return !!card.description || card.tags.length > 0 || !!card.dueDate || card.assignees.length > 0;
}

/** Stops events on a control inside a card from opening the card or starting a drag. */
const keepInside = {
  onClick: (e: SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: SyntheticEvent) => e.stopPropagation(),
  onPointerDown: (e: SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: SyntheticEvent) => e.stopPropagation(),
};

const DESCRIPTION_LINES = 3;

/**
 * Description clamped to three lines with "…". When it's longer, a button expands it in place
 * (only on this card, until the page reloads).
 */
function CardDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    // Clamped, the text is cut off exactly when it's taller than the box it's shown in.
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <Box>
      <Typography
        ref={ref}
        variant="body2"
        sx={{
          // Lighter than body text but still 4.6:1 on white; italic sets it apart from the title.
          color: "grey.600",
          fontStyle: "italic",
          whiteSpace: "pre-line",
          overflowWrap: "anywhere",
          ...(!expanded && {
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: DESCRIPTION_LINES,
            overflow: "hidden",
          }),
        }}
      >
        {text}
      </Typography>
      {(overflows || expanded) && (
        <Button
          size="small"
          {...keepInside}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
          sx={{ p: 0, mt: 0.25, minWidth: 0, fontSize: 12 }}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </Box>
  );
}

/**
 * Visual card, shared by the sortable item and the drag overlay: title, a line in the board's
 * color, then description, tags, due date and assignees, each only when there is one.
 */
export function CardFace({
  card,
  accent,
  dragging,
  handle,
}: {
  card: BoardCard;
  /** The board's color, used for the line under the title. */
  accent: string;
  dragging?: boolean;
  /** dnd-kit's handle props from useSortable; the drag overlay shows the icon without them. */
  handle?: Omit<Parameters<typeof DragHandle>[0], "label" | "dragging">;
}) {
  const hasDetails = cardHasDetails(card);
  const [collapsed, toggleCollapsed] = useCardCollapsed(card.id);
  const showDetails = hasDetails && !collapsed;
  return (
    <Paper
      elevation={dragging ? 6 : 1}
      sx={{
        p: 1.25,
        position: "relative",
        cursor: "pointer",
        transform: dragging ? "rotate(3deg)" : undefined,
        // Hover outline on a layer above the contents, so it also shows over the color band
        // (an inset box-shadow is painted under the card's children).
        "&::after": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          border: 2,
          borderColor: "primary.main",
          opacity: 0,
          pointerEvents: "none",
        },
        "&:hover::after": { opacity: 1 },
      }}
    >
      {/*
        Title row: the grip (the only place the card drags from), the title, then on the right
        the priority and the collapse arrow, so both stay visible on a collapsed card.
      */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "flex-start", ml: -0.5 }}>
        <DragHandle label={`Drag card ${card.title}`} dragging={dragging} {...handle} />
        <Typography
          variant="body2"
          sx={{
            lineHeight: 1.3,
            pt: 0.25,
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {card.title}
        </Typography>
        <Stack
          direction="row"
          sx={{ ml: "auto !important", alignItems: "center", flexShrink: 0, pt: 0.125 }}
        >
          {card.priority && <PriorityIcon priority={card.priority} />}
          {/* Collapse to just the title (and grip). Only when there's something to hide. */}
          {hasDetails && toggleCollapsed && !dragging && (
            <IconButton
              size="small"
              {...keepInside}
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed();
              }}
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Expand" : "Collapse"} card ${card.title}`}
              sx={{ mt: -0.25, mr: -0.75, p: 0.25, color: "text.secondary" }}
            >
              {collapsed ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ExpandLessIcon fontSize="small" />
              )}
            </IconButton>
          )}
        </Stack>
      </Stack>
      {showDetails && <Box role="separator" sx={{ height: "1px", mt: 0.75, bgcolor: accent }} />}
      {showDetails && (
        <Stack spacing={1} sx={{ mt: 1 }}>
          {card.description && <CardDescription text={card.description} />}
          {card.tags.length > 0 && (
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
              {card.tags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </Stack>
          )}
          {card.dueDate && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center", color: "text.secondary" }}
            >
              <ScheduleIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption">Due {formatDue(card.dueDate)}</Typography>
            </Stack>
          )}
          {card.assignees.length > 0 && (
            <AvatarGroup
              max={5}
              // AvatarGroup lays out right to left, so by default the avatars sit on the right.
              // The "+N" avatar matches the others.
              sx={{ "& .MuiAvatar-root": { width: 24, height: 24, fontSize: 11, fontWeight: 700 } }}
            >
              {card.assignees.map((u) => (
                <UserAvatar key={u.id} user={u} size={24} />
              ))}
            </AvatarGroup>
          )}
        </Stack>
      )}
    </Paper>
  );
}

export function SortableCard({
  card,
  accent,
  onOpen,
}: {
  card: BoardCard;
  accent: string;
  onOpen: (id: string) => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${card.id}`,
    data: { type: "card" },
  });
  return (
    // Clicking the card (or Enter/Space on it) opens it; only the grip drags it.
    <Box
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      data-testid="card"
      aria-label={`Card ${card.title}`}
      onClick={() => onOpen(card.id)}
      onKeyDown={(e) => {
        // Keys pressed on the grip or the "Show more" button are theirs, not the card's.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(card.id);
        }
      }}
      sx={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        borderRadius: 1,
        "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <CardFace
        card={card}
        accent={accent}
        handle={{ attributes, listeners, activatorRef: setActivatorNodeRef }}
      />
    </Box>
  );
}
