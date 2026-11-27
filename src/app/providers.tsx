"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { NotifyProvider } from "@/client/notify";
import { theme } from "@/theme";

/** App-wide providers. Apollo lives in AppFrame instead, with one client per signed-in user. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotifyProvider>{children}</NotifyProvider>
    </ThemeProvider>
  );
}
