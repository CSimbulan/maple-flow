"use client";

import { useQuery } from "@apollo/client/react";
import CheckIcon from "@mui/icons-material/Check";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import SortIcon from "@mui/icons-material/Sort";
import WorkspacesOutlinedIcon from "@mui/icons-material/WorkspacesOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BRAND } from "@/brand";
import type { HomeQuery as HomeData } from "@/gql/graphql";
import {
  ASSIGNED_SORTS,
  ASSIGNED_SORT_LABELS,
  parseAssignedSort,
  sortAssigned,
  type AssignedSort,
} from "@/lib/assigned-sort";
import { dueBucket, type DueBucket } from "@/lib/due-buckets";
import { formatDate } from "@/lib/format-date";
import { HomeQuery } from "../operations";
import { ActivityChart } from "./ActivityChart";
import { BoardTiles, TileGrid, tileSx } from "./BoardTiles";
import { PageContainer, plural } from "./OrgPages";
import { PageLoading } from "./PageLoading";
import { PriorityIcon } from "./PriorityIcon";

type AssignedCard = HomeData["assignedCards"][number];

/**
 * /home: the signed-in user's own page. Their workspaces, the boards with the most recent work,
 * the cards assigned to them, and boards shared with them as a guest.
 */
export function HomePage() {
  const { data, loading, error } = useQuery(HomeQuery, {
    // The activity graph counts days in the viewer's own time zone.
    variables: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    // Work happens elsewhere; show fresh activity each time someone comes back home.
    fetchPolicy: "cache-and-network",
  });
  // A number tile that's narrowing Assigned to Me, if any (not remembered across reloads).
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>("all");
  const filterAssigned = (filter: AssignedFilter) => {
    setAssignedFilter((current) => (current === filter ? "all" : filter));
    // Scroll the page area (AppFrame's <main>), not the window: scrollIntoView would also
    // shift the whole frame and push the top bar off screen.
    const section = document.getElementById(ASSIGNED_SECTION_ID);
    const main = section?.closest("main");
    if (section && main) {
      const top = section.getBoundingClientRect().top - main.getBoundingClientRect().top;
      main.scrollBy({ top: top - 16, behavior: "smooth" });
    }
  };
  const [assignedSort, setAssignedSort] = useState(readAssignedSort);
  const chooseAssignedSort = (sort: AssignedSort) => {
    setAssignedSort(sort);
    try {
      localStorage.setItem(ASSIGNED_SORT_KEY, sort);
    } catch {
      // Can't save (private window, full storage): it still applies until the page reloads.
    }
  };

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    );
  if (loading && !data) return <PageLoading label="Loading home" />;
  if (!data) return null;

  const me = data.me;
  const firstName = (me?.name ?? me?.email ?? "").split(/[\s@]/)[0];
  const today = new Date();
  const counts = { overdue: 0, today: 0, week: 0 };
  for (const card of data.assignedCards) {
    const bucket = dueBucket(card.dueDate, today);
    if (bucket === "overdue") counts.overdue++;
    if (bucket === "today") counts.today++;
    if (bucket === "today" || bucket === "week") counts.week++;
  }
  const shownCards = data.assignedCards.filter((card) =>
    matchesFilter(dueBucket(card.dueDate, today), assignedFilter),
  );

  return (
    <PageContainer>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Here&apos;s what&apos;s happening across your workspaces.
      </Typography>

      {/* At a glance: number tiles on the left, the activity graph on the right. */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
          mb: 4,
        }}
      >
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <NumberTile
            label="Assigned"
            value={data.assignedCardCount}
            selected={false}
            onClick={() => filterAssigned("all")}
          />
          <NumberTile
            label="Overdue"
            value={counts.overdue}
            alert={counts.overdue > 0}
            selected={assignedFilter === "overdue"}
            onClick={() => filterAssigned("overdue")}
          />
          <NumberTile
            label="Due Today"
            value={counts.today}
            selected={assignedFilter === "today"}
            onClick={() => filterAssigned("today")}
          />
          <NumberTile
            label="Next 7 Days"
            value={counts.week}
            selected={assignedFilter === "week"}
            onClick={() => filterAssigned("week")}
          />
        </Box>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" component="h2" sx={{ mb: 0.5 }}>
            Your Activity
          </Typography>
          <ActivityChart days={data.myActivity} />
        </Paper>
      </Box>

      <Section title="Workspaces">
        <TileGrid>
          {data.workspaces.map((w) => (
            <ButtonBase
              key={w.id}
              component={Link}
              href={`/w/${w.id}`}
              sx={{
                ...tileSx,
                // Grow on narrow screens so the caption can wrap instead of being cut off.
                height: "auto",
                minHeight: tileSx.height,
                gap: 1,
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "flex-start",
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                "&:hover": { borderColor: "primary.main", bgcolor: BRAND.warmWhite },
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", minWidth: 0, width: "100%" }}
              >
                <WorkspacesOutlinedIcon fontSize="small" color="primary" />
                <Typography noWrap sx={{ fontWeight: 700, textAlign: "left" }}>
                  {w.name}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "left" }}>
                {w.viewerIsOwner ? "Owner · " : ""}
                {plural(w.members.length, "member")} · {plural(w.projects.length, "project")}
              </Typography>
            </ButtonBase>
          ))}
        </TileGrid>
      </Section>

      <Section title="Recent Boards">
        {data.recentBoards.length > 0 ? (
          <BoardTiles
            boards={data.recentBoards.map((b) => ({
              ...b,
              caption: [
                ...(b.project ? [`${b.project.workspace.name} › ${b.project.name}`] : []),
                `Updated ${formatDate(b.lastActivityAt)}`,
              ],
            }))}
          />
        ) : (
          <Empty>No boards yet.</Empty>
        )}
      </Section>

      <Section
        id={ASSIGNED_SECTION_ID}
        title="Assigned to Me"
        action={
          <>
            {assignedFilter !== "all" && (
              <Chip
                size="small"
                label={`${FILTER_LABELS[assignedFilter]} · Show All`}
                onDelete={() => setAssignedFilter("all")}
                onClick={() => setAssignedFilter("all")}
              />
            )}
            {data.assignedCards.length > 1 && (
              <SortMenu value={assignedSort} onChange={chooseAssignedSort} />
            )}
          </>
        }
      >
        {shownCards.length > 0 ? (
          <Stack spacing={1}>
            {sortAssigned(shownCards, assignedSort).map((card) => (
              <AssignedCardRow key={card.id} card={card} />
            ))}
          </Stack>
        ) : (
          <Empty>
            {data.assignedCards.length > 0 ? "No cards here." : "Nothing assigned to you."}
          </Empty>
        )}
      </Section>

      {data.sharedBoards.length > 0 && (
        <Section title="Shared with Me">
          <BoardTiles boards={data.sharedBoards} />
        </Section>
      )}
    </PageContainer>
  );
}

function Section({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: string;
  /** A control at the right end of the heading, e.g. a sort menu. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box component="section" id={id} aria-label={title} sx={{ mb: 4, scrollMarginTop: 16 }}>
      <Stack direction="row" sx={{ alignItems: "center", mb: 1.5, gap: 1 }}>
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

const ASSIGNED_SORT_KEY = "mf-assigned-sort";
const ASSIGNED_SECTION_ID = "assigned-to-me";

type AssignedFilter = "all" | "overdue" | "today" | "week";

const FILTER_LABELS: Record<Exclude<AssignedFilter, "all">, string> = {
  overdue: "Overdue",
  today: "Due Today",
  week: "Next 7 Days",
};

/** Whether a card in `bucket` shows under `filter` ("Next 7 Days" includes today). */
function matchesFilter(bucket: DueBucket, filter: AssignedFilter): boolean {
  if (filter === "all") return true;
  if (filter === "week") return bucket === "today" || bucket === "week";
  return bucket === filter;
}

/**
 * One number in the "at a glance" band. Clicking it narrows Assigned to Me to those cards
 * (and again to clear). `alert` shows the number in red.
 */
function NumberTile({
  label,
  value,
  alert = false,
  selected,
  onClick,
}: {
  label: string;
  value: number;
  alert?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${label}: ${value}`}
      sx={{
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 0.5,
        p: 1.5,
        minHeight: 84,
        borderRadius: 2,
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        outline: selected ? "1px solid" : "none",
        outlineColor: "primary.main",
        bgcolor: selected ? BRAND.warmWhite : "background.paper",
        "&:hover": { borderColor: "primary.main", bgcolor: BRAND.warmWhite },
        textAlign: "left",
      }}
    >
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1,
          color: alert ? "error.main" : "text.primary",
        }}
      >
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </ButtonBase>
  );
}

/** The remembered order for Assigned to Me (this browser only), or Due Soon. */
function readAssignedSort(): AssignedSort {
  try {
    return parseAssignedSort(localStorage.getItem(ASSIGNED_SORT_KEY));
  } catch {
    // On the server, or storage is blocked.
    return parseAssignedSort(null);
  }
}

/** "Sort: Due Soon" button with a menu of the orders; the current one is checked. */
function SortMenu({
  value,
  onChange,
}: {
  value: AssignedSort;
  onChange: (sort: AssignedSort) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button
        size="small"
        color="inherit"
        startIcon={<SortIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-label={`Sort assigned cards: ${ASSIGNED_SORT_LABELS[value]}`}
      >
        {ASSIGNED_SORT_LABELS[value]}
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {ASSIGNED_SORTS.map((sort) => (
          <MenuItem
            key={sort}
            selected={sort === value}
            onClick={() => {
              setAnchor(null);
              onChange(sort);
            }}
          >
            <ListItemIcon>{sort === value && <CheckIcon fontSize="small" />}</ListItemIcon>
            {ASSIGNED_SORT_LABELS[sort]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <Typography color="text.secondary">{children}</Typography>;
}

/** Start of today in the viewer's time zone, to tell overdue cards apart. */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** One assigned card: its title and priority, due date, and where it is. Opens on its board. */
function AssignedCardRow({ card }: { card: AssignedCard }) {
  // Due dates are calendar days stored as midnight UTC; compare the day, not the moment.
  const due = card.dueDate ? new Date(card.dueDate.slice(0, 10) + "T00:00:00") : null;
  const overdue = due !== null && due < startOfToday();
  return (
    <Paper
      variant="outlined"
      component={Link}
      href={`/b/${card.board.id}?card=${card.id}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        color: "inherit",
        textDecoration: "none",
        // The board's color as a stripe on the left, to tell boards apart at a glance.
        borderLeft: 4,
        borderLeftColor: card.board.background,
        "&:hover": { borderColor: "primary.main", borderLeftColor: card.board.background },
      }}
    >
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
          {card.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="p">
          {card.board.title} › {card.list.title}
        </Typography>
      </Box>
      {due && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            flexShrink: 0,
            color: overdue ? "error.main" : "text.secondary",
          }}
        >
          <EventOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
          <Typography variant="caption" sx={{ color: "inherit", fontWeight: overdue ? 600 : 400 }}>
            {overdue ? "Overdue · " : ""}
            {formatDate(due)}
          </Typography>
        </Stack>
      )}
      {card.priority && <PriorityIcon priority={card.priority} />}
    </Paper>
  );
}
