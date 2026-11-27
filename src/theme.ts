"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: "#2e7d6b" },
    secondary: { main: "#c2410c" },
    background: { default: "#f4f5f7" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
