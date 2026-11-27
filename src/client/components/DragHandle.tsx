"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";

/** Long-pressing to drag on touch screens shouldn't select text or open the callout menu. */
const noTouchSelectSx = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
} as const;

/**
 * Grip icon that is the only place a list or card can be dragged from, so the rest of it works
 * like ordinary controls. Pass dnd-kit's attributes, listeners and activator ref from
 * useSortable; without them (the drag overlay) it's just the icon.
 */
export function DragHandle({
  label,
  dragging,
  attributes,
  listeners,
  activatorRef,
}: {
  label: string;
  dragging?: boolean;
  attributes?: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  activatorRef?: (el: HTMLElement | null) => void;
}) {
  return (
    <Box
      ref={activatorRef}
      {...attributes}
      {...listeners}
      aria-label={label}
      // A click on the handle (no drag) shouldn't also click what it sits in, e.g. open a card.
      onClick={(e) => e.stopPropagation()}
      sx={{
        ...noTouchSelectSx,
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        p: 0.25,
        borderRadius: 1,
        color: "text.secondary",
        cursor: dragging ? "grabbing" : "grab",
        // The touch sensor's long-press needs the browser not to treat it as a scroll.
        touchAction: "none",
        "&:hover": { color: "text.primary", bgcolor: "rgba(0,0,0,0.06)" },
        "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
      }}
    >
      <DragIndicatorIcon fontSize="small" />
    </Box>
  );
}
