import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { signOut } from "@/server/auth/config";
import { AppHeader, type HeaderUser } from "./AppHeader";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/signin" });
}

/** Page frame: header plus a full-height main area. Server component. */
export function AppShell({ user, children }: { user: HeaderUser; children: ReactNode }) {
  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <AppHeader
        user={{ name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }}
        signOutAction={signOutAction}
      />
      <Box
        component="main"
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {children}
      </Box>
    </Box>
  );
}
