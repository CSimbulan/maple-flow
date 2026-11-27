"use client";

import { ApolloProvider } from "@apollo/client/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { getApolloClient } from "@/client/apollo/client";
import { NotifyProvider } from "@/client/notify";
import { theme } from "@/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ApolloProvider client={getApolloClient()}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotifyProvider>{children}</NotifyProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
