"use client";

import Avatar, { type AvatarProps } from "@mui/material/Avatar";
import { BRAND } from "@/brand";

export type AvatarUser = { name: string | null; email: string; image: string | null };

/** First letter of the person's name (or email), for avatars without a photo. */
export function userInitial(u: { name: string | null; email: string }) {
  return (u.name ?? u.email).slice(0, 1).toUpperCase();
}

/**
 * A person's avatar, the same everywhere: their photo, or a bold white initial on brand orange.
 * Sizes differ by place (24px on cards, 30px in the bars, 32px in comments, 40px in member
 * lists); the initial scales with it. `onBar` adds a white ring so the orange circle stands out
 * on the red top bar and board header. `null` (a deleted user) shows "?".
 *
 * Other props go to MUI's Avatar, so AvatarGroup can pass its own class and styles through.
 */
export function UserAvatar({
  user,
  size,
  onBar = false,
  sx,
  ...rest
}: {
  user: AvatarUser | null;
  size: number;
  onBar?: boolean;
} & Omit<AvatarProps, "children" | "src">) {
  return (
    <Avatar
      src={user?.image ?? undefined}
      alt={user ? (user.name ?? user.email) : ""}
      {...rest}
      sx={[
        {
          width: size,
          height: size,
          fontSize: Math.round(size * 0.45),
          fontWeight: 700,
          bgcolor: BRAND.orange,
          color: "#fff",
        },
        onBar && { border: "2px solid #fff" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {user ? userInitial(user) : "?"}
    </Avatar>
  );
}
