"use client";

import { createTheme } from "@mui/material/styles";
import { BRAND } from "./brand";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: BRAND.red, dark: BRAND.redDark, contrastText: "#fff" },
    secondary: { main: BRAND.orange, dark: BRAND.orangeDark, contrastText: "#fff" },
    background: { default: "#ffffff", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    // Initials avatars (no photo) use the brand orange instead of gray, with a bold letter, like
    // UserAvatar. This also styles AvatarGroup's "+N" avatar.
    MuiAvatar: {
      styleOverrides: {
        colorDefault: {
          backgroundColor: BRAND.orange,
          color: "#fff",
          fontWeight: 700,
          // Same optical centering as UserAvatar's initial (see CENTERED_INITIAL there).
          textBox: "trim-both cap alphabetic",
        },
      },
    },
  },
});
