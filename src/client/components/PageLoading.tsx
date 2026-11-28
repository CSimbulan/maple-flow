"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { BRAND } from "@/brand";
import { MapleLogo } from "./MapleLogo";

const SIZE = 112;

/**
 * Shown while a page's data loads: a red spinning ring with the gradient maple leaf in the
 * middle. It fills the page's main area (AppFrame's flex column below the top bar, beside the
 * sidebar when it's docked, full width when it's a drawer), so it's centered in what's visible.
 * `label` is what screen readers announce.
 */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        p: 2,
      }}
    >
      <Box sx={{ position: "relative", width: SIZE, height: SIZE }}>
        <CircularProgress
          size={SIZE}
          thickness={2.5}
          aria-label={label}
          sx={{ color: BRAND.red, display: "block" }}
        />
        <MapleLogo
          gradient
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            m: "auto",
            fontSize: Math.round(SIZE * 0.55),
          }}
        />
      </Box>
    </Box>
  );
}
