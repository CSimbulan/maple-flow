"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export type HeaderUser = { name?: string | null; email?: string | null; image?: string | null };

export function AppHeader({
  user,
  signOutAction,
}: {
  user: HeaderUser;
  signOutAction: () => Promise<void>;
}) {
  return (
    <AppBar position="static" elevation={0} color="primary">
      <Toolbar variant="dense" sx={{ gap: 2 }}>
        <Typography
          component={Link}
          href="/boards"
          variant="h6"
          sx={{ color: "inherit", textDecoration: "none", fontWeight: 700, flexGrow: 1 }}
        >
          Maple Flow
        </Typography>
        <Tooltip title={user.email ?? ""}>
          <Avatar src={user.image ?? undefined} sx={{ width: 30, height: 30, fontSize: 14 }}>
            {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
          </Avatar>
        </Tooltip>
        <form action={signOutAction}>
          <Button type="submit" color="inherit" size="small">
            Sign out
          </Button>
        </form>
      </Toolbar>
    </AppBar>
  );
}
