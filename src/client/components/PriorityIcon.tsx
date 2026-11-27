"use client";

import DragHandleIcon from "@mui/icons-material/DragHandle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardDoubleArrowDownIcon from "@mui/icons-material/KeyboardDoubleArrowDown";
import KeyboardDoubleArrowUpIcon from "@mui/icons-material/KeyboardDoubleArrowUp";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { PRIORITY_LABELS, type Priority } from "@/lib/priority";

// Red up arrows for high, green bars for medium, blue down arrows for low; doubled at the ends.
const ICONS = {
  HIGHEST: { Icon: KeyboardDoubleArrowUpIcon, color: "#d32f2f" },
  HIGH: { Icon: KeyboardArrowUpIcon, color: "#d32f2f" },
  MEDIUM: { Icon: DragHandleIcon, color: "#2e7d32" },
  LOW: { Icon: KeyboardArrowDownIcon, color: "#1976d2" },
  LOWEST: { Icon: KeyboardDoubleArrowDownIcon, color: "#1976d2" },
} satisfies Record<Priority, unknown>;

/**
 * The icon for a priority, named for screen readers ("Priority: High") unless `decorative`
 * (when its name is written next to it anyway).
 */
export function PriorityIcon({
  priority,
  fontSize = "small",
  decorative,
}: {
  priority: Priority;
  fontSize?: SvgIconProps["fontSize"];
  decorative?: boolean;
}) {
  const { Icon, color } = ICONS[priority];
  return (
    <Icon
      fontSize={fontSize}
      titleAccess={decorative ? undefined : `Priority: ${PRIORITY_LABELS[priority]}`}
      aria-hidden={decorative || undefined}
      sx={{ color, flexShrink: 0 }}
    />
  );
}
