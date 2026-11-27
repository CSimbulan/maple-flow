"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { BRAND, BRAND_GRADIENT } from "@/brand";

export type HeaderUser = { name?: string | null; email?: string | null; image?: string | null };

export function AppHeader({
  user,
  signOutAction,
}: {
  user: HeaderUser;
  signOutAction: () => Promise<void>;
}) {
  return (
    <AppBar position="static" elevation={0} sx={{ background: BRAND_GRADIENT, color: "#fff" }}>
      <Toolbar variant="dense" sx={{ gap: 2 }}>
        <Typography
          component={Link}
          href="/boards"
          variant="h6"
          sx={{ color: "inherit", textDecoration: "none", fontWeight: 700 }}
        >
          Maple Flow
        </Typography>
        {/* Spacer pushes the user controls right without widening the title link. */}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={user.email ?? ""}>
          <Avatar
            src={user.image ?? undefined}
            sx={{
              width: 30,
              height: 30,
              fontSize: 14,
              bgcolor: "#fff",
              color: BRAND.red,
              fontWeight: 700,
            }}
          >
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
