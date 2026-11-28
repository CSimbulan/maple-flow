"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BRAND } from "@/brand";

type Day = { date: string; count: number };

const CHART_HEIGHT = 96;

/** Hidden on screen but read by screen readers. */
const visuallyHidden = {
  position: "absolute",
  // Strings: in sx a bare 1 means 100%, not 1px.
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
  p: 0,
  m: "-1px",
} as const;

/** "Nov 27" for a YYYY-MM-DD day, without time zone shifts. */
function dayLabel(date: string, options: Intl.DateTimeFormatOptions) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, options);
}

const plural = (n: number) => `${n} ${n === 1 ? "action" : "actions"}`;

/**
 * Columns for how much someone did each day (oldest on the left, today on the right). One
 * series, so no legend: the heading names it. Bars grow from one baseline with rounded tops;
 * today's is full brand red, earlier days lighter. Each day's whole column is the hover target
 * for its tooltip; a hidden table carries the numbers for screen readers.
 */
export function ActivityChart({ days }: { days: Day[] }) {
  const total = days.reduce((n, d) => n + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  const range = `the last ${days.length} days`;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {total > 0 ? `${plural(total)} in ${range}` : "No activity yet."}
      </Typography>
      <Box
        role="img"
        aria-label={`Your activity, ${range}: ${plural(total)}`}
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          alignItems: "end",
          height: CHART_HEIGHT,
          // The baseline every bar grows from.
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {days.map((day, i) => {
          const today = i === days.length - 1;
          return (
            <Tooltip
              key={day.date}
              title={`${dayLabel(day.date, { month: "short", day: "numeric" })}: ${plural(day.count)}`}
              placement="top"
              disableInteractive
            >
              {/* The whole column is the hover target, not just the bar. */}
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  px: "1px", // with the neighbor's, a 2px gap between bars
                  cursor: "default",
                  "&:hover > *": { opacity: 1 },
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 24,
                    height: day.count > 0 ? `${Math.max(4, (day.count / max) * 100)}%` : 0,
                    bgcolor: BRAND.red,
                    opacity: today ? 1 : 0.55,
                    borderRadius: "4px 4px 0 0",
                    transition: "opacity 120ms",
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      {/* Weekday initials under the columns. */}
      <Box
        aria-hidden
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
          mt: 0.5,
        }}
      >
        {days.map((day, i) => (
          <Typography
            key={day.date}
            variant="caption"
            color={i === days.length - 1 ? "text.primary" : "text.secondary"}
            sx={{ textAlign: "center", fontWeight: i === days.length - 1 ? 700 : 400 }}
          >
            {dayLabel(day.date, { weekday: "narrow" })}
          </Typography>
        ))}
      </Box>
      <Box component="table" sx={visuallyHidden}>
        <caption>Your activity by day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{dayLabel(day.date, { weekday: "long", month: "short", day: "numeric" })}</td>
              <td>{day.count}</td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}
