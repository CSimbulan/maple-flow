"use client";

import CakeIcon from "@mui/icons-material/Cake";
import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";
import Tooltip from "@mui/material/Tooltip";
import { green, pink } from "@mui/material/colors";
import type { ReactElement } from "react";
import { formatDate } from "@/lib/format-date";
import { anniversaryYears, isNewMember } from "@/lib/membership";

/** A simple leaf (Material's "eco" icon). */
function LeafIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z" />
    </SvgIcon>
  );
}

/**
 * Small icons after a workspace member's name: a green leaf in their first week, a cake on the
 * anniversary of the day they joined. Both explain themselves on hover and to screen readers.
 */
export function MemberBadges({ joinedAt }: { joinedAt: Date }) {
  const now = new Date();
  const years = anniversaryYears(joinedAt, now);
  return (
    <>
      {isNewMember(joinedAt, now) && (
        <Badge title={`New member: joined ${formatDate(joinedAt)}`}>
          <LeafIcon titleAccess="New member" fontSize="small" sx={{ color: green[700] }} />
        </Badge>
      )}
      {years !== null && (
        <Badge title={`${years}-year anniversary today`}>
          <CakeIcon
            titleAccess={`${years}-year anniversary`}
            fontSize="small"
            sx={{ color: pink[600] }}
          />
        </Badge>
      )}
    </>
  );
}

function Badge({ title, children }: { title: string; children: ReactElement }) {
  return (
    <Tooltip title={title}>
      {/* A focusable wrapper so keyboard users can reach the tooltip too. */}
      <span tabIndex={0} style={{ display: "inline-flex" }}>
        {children}
      </span>
    </Tooltip>
  );
}
