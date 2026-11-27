import { alpha } from "@mui/material/styles";
import { blue } from "@mui/material/colors";

// Material UI's default primary blue, for dialog buttons. This app's theme makes `primary` red,
// so these set the color directly. Disabled buttons keep MUI's grey (its `.Mui-disabled` rule
// is more specific than these).

/** Filled blue button (Save, Done). */
export const blueContainedSx = {
  bgcolor: blue[700],
  color: "#fff",
  "&:hover": { bgcolor: blue[800] },
} as const;

/** Outlined blue button (Cancel). */
export const blueOutlinedSx = {
  color: blue[700],
  borderColor: blue[700],
  "&:hover": { borderColor: blue[800], bgcolor: alpha(blue[700], 0.06) },
} as const;
