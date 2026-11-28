"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { blue, green } from "@mui/material/colors";
import { useState, type KeyboardEvent } from "react";
import type { ActivityFieldsFragment, CommentFieldsFragment } from "@/gql/graphql";
import { readFeedPrefs, writeFeedPrefs, type FeedPrefs } from "../feed-prefs";
import { activityGroupText, groupActivity, type TextPart } from "../activity-text";
import { blueContainedSx, blueOutlinedSx } from "../buttons";
import { errorMessage, useNotify } from "../notify";
import {
  AddCommentMutation,
  CardFeedQuery,
  DeleteCommentMutation,
  UpdateCommentMutation,
} from "../operations";
import { userInitial } from "./CardItem";
import { ConfirmDelete } from "./ConfirmDelete";
import { PriorityIcon } from "./PriorityIcon";
import { TagChip } from "./TagChip";

// Comments are light blue and activity light green; each toggle uses its color.
const COMMENT_BG = blue[50];
const ACTIVITY_BG = green[50];

/** A switch in one hue: a strong thumb on a light track when on. */
const switchSx = (strong: string, light: string) => ({
  "& .MuiSwitch-switchBase.Mui-checked": { color: strong },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: light, opacity: 1 },
});

type Person = { name: string | null; email: string; image: string | null } | null;

type FeedItem =
  | { type: "comment"; at: string; comment: CommentFieldsFragment }
  | { type: "activity"; at: string; group: ActivityFieldsFragment[] };

/** Date and time, e.g. "Nov 27, 2026, 3:04 PM". */
const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const personName = (p: Person) => (p ? (p.name ?? p.email) : "Someone");

/** Ctrl+Enter (Cmd+Enter on a Mac) in a comment box. */
const isSubmitKey = (e: KeyboardEvent) => e.key === "Enter" && (e.ctrlKey || e.metaKey);

/**
 * A card's comments and activity in one feed. Both show by default; each can be switched off
 * and the order flipped, and those choices are remembered.
 */
export function CardFeed({ cardId }: { cardId: string }) {
  const notify = useNotify();
  // Remembered in this browser, so the next card opens the same way. The dialog only ever
  // renders in the browser (it opens on a click), so reading storage here can't mismatch SSR.
  const [prefs, setPrefs] = useState(readFeedPrefs);
  const { showComments, showActivity, newestFirst } = prefs;
  const setPref = (change: Partial<FeedPrefs>) => {
    const next = { ...prefs, ...change };
    setPrefs(next);
    writeFeedPrefs(next);
  };
  const [draft, setDraft] = useState("");
  const { data, loading } = useQuery(CardFeedQuery, {
    variables: { id: cardId },
    // Card edits add activity, so fetch fresh entries each time the card is opened.
    fetchPolicy: "cache-and-network",
  });
  const [addComment, { loading: posting }] = useMutation(AddCommentMutation);

  async function post() {
    const text = draft.trim();
    if (!text) return;
    try {
      await addComment({ variables: { cardId, text } });
      setDraft("");
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  const card = data?.card;
  const items: FeedItem[] = [
    ...(showComments ? (card?.comments ?? []) : []).map((comment): FeedItem => ({
      type: "comment",
      at: comment.createdAt,
      comment,
    })),
    // Changes saved together (same person, same moment) show as one entry.
    ...groupActivity(showActivity ? (card?.activity ?? []) : []).map((group): FeedItem => ({
      type: "activity",
      at: group[0].createdAt,
      group,
    })),
  ].sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));

  return (
    <Box component="section" aria-label="Comments & Activity">
      <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Comments & Activity
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showComments}
              sx={switchSx(blue[600], blue[200])}
              onChange={(e) => setPref({ showComments: e.target.checked })}
            />
          }
          label="Comments"
          slotProps={{ typography: { variant: "body2" } }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showActivity}
              sx={switchSx(green[600], green[200])}
              onChange={(e) => setPref({ showActivity: e.target.checked })}
            />
          }
          label="Activity"
          slotProps={{ typography: { variant: "body2" } }}
        />
        <Button
          size="small"
          color="inherit"
          startIcon={<SwapVertIcon />}
          onClick={() => setPref({ newestFirst: !newestFirst })}
          aria-label={`Sorted ${newestFirst ? "newest" : "oldest"} first. Change order`}
        >
          {newestFirst ? "Newest first" : "Oldest first"}
        </Button>
      </Stack>

      {showComments && (
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Write a comment…"
            multiline
            minRows={2}
            fullWidth
            size="small"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (isSubmitKey(e)) {
                e.preventDefault();
                void post();
              }
            }}
            slotProps={{ htmlInput: { "aria-label": "New comment", maxLength: 5000 } }}
          />
          {draft.trim() && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDraft("")}
                sx={blueOutlinedSx}
              >
                Discard
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={post}
                disabled={posting}
                sx={blueContainedSx}
              >
                Comment
              </Button>
            </Stack>
          )}
        </Box>
      )}

      {!card && loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {!showComments && !showActivity
            ? "Switch on comments or activity to see them."
            : showComments && !showActivity
              ? "No comments yet."
              : "Nothing here yet."}
        </Typography>
      ) : (
        <Stack component="ol" spacing={2} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {items.map((item) =>
            item.type === "comment" ? (
              <CommentItem key={item.comment.id} comment={item.comment} />
            ) : (
              <ActivityItem key={item.group[0].id} group={item.group} />
            ),
          )}
        </Stack>
      )}
    </Box>
  );
}

function PersonAvatar({ person, size }: { person: Person; size: number }) {
  return (
    <Avatar
      src={person?.image ?? undefined}
      alt=""
      sx={{ width: size, height: size, fontSize: size / 2, mt: 0.25 }}
    >
      {person ? userInitial(person) : "?"}
    </Avatar>
  );
}

function Timestamp({ iso, edited }: { iso: string; edited?: string | null }) {
  return (
    <Typography variant="caption" color="text.secondary" component="span">
      <time dateTime={iso}>{formatTime(iso)}</time>
      {edited && <span title={`Edited ${formatTime(edited)}`}> (edited)</span>}
    </Typography>
  );
}

function CommentItem({ comment }: { comment: CommentFieldsFragment }) {
  const notify = useNotify();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateComment, { loading: saving }] = useMutation(UpdateCommentMutation);
  const [deleteComment, { loading: deleting }] = useMutation(DeleteCommentMutation);

  async function save() {
    if (!text.trim()) return;
    try {
      await updateComment({ variables: { id: comment.id, text: text.trim() } });
      setEditing(false);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  async function remove() {
    try {
      await deleteComment({ variables: { id: comment.id } });
    } catch (err) {
      notify(errorMessage(err));
      setConfirmDelete(false);
    }
  }

  return (
    <Box component="li" sx={{ display: "flex", gap: 1.5 }}>
      <PersonAvatar person={comment.author} size={32} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: "baseline", columnGap: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {personName(comment.author)}
          </Typography>
          <Timestamp iso={comment.createdAt} edited={comment.editedAt} />
        </Stack>
        {editing ? (
          <Box sx={{ mt: 0.5 }}>
            <TextField
              multiline
              minRows={2}
              fullWidth
              size="small"
              autoFocus
              // Start typing at the end of the existing text, not the beginning.
              onFocus={(e) =>
                e.target.setSelectionRange(e.target.value.length, e.target.value.length)
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (isSubmitKey(e)) {
                  e.preventDefault();
                  void save();
                } else if (e.key === "Escape") {
                  // Cancel the edit, not the whole card dialog.
                  e.stopPropagation();
                  setEditing(false);
                  setText(comment.text);
                }
              }}
              slotProps={{ htmlInput: { "aria-label": "Edit comment", maxLength: 5000 } }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setEditing(false);
                  setText(comment.text);
                }}
                sx={blueOutlinedSx}
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={save}
                disabled={saving || !text.trim()}
                sx={blueContainedSx}
              >
                Save
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              mt: 0.5,
              px: 1.5,
              py: 1,
              bgcolor: COMMENT_BG,
              borderRadius: 1,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            <Typography variant="body2">{comment.text}</Typography>
          </Box>
        )}
        {comment.viewerIsAuthor && !editing && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }}>
            <Button size="small" color="inherit" onClick={() => setEditing(true)} sx={linkSx}>
              Edit
            </Button>
            <Button size="small" color="inherit" onClick={() => setConfirmDelete(true)} sx={linkSx}>
              Delete
            </Button>
          </Stack>
        )}
      </Box>
      <ConfirmDelete
        open={confirmDelete}
        title="Delete Comment?"
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      >
        This permanently deletes your comment. It can&apos;t be undone.
      </ConfirmDelete>
    </Box>
  );
}

const linkSx = {
  minWidth: 0,
  px: 0.75,
  py: 0,
  fontSize: 12,
  color: "text.secondary",
  textDecoration: "underline",
} as const;

function ActivityItem({ group }: { group: ActivityFieldsFragment[] }) {
  const [activity] = group;
  return (
    <Box component="li" sx={{ display: "flex", gap: 1.5 }}>
      {/* Same column as comment avatars, a little smaller. */}
      <Box sx={{ width: 32, display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <PersonAvatar person={activity.actor} size={24} />
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1, px: 1.5, py: 1, bgcolor: ACTIVITY_BG, borderRadius: 1 }}>
        <Typography variant="body2">
          <Box component="span" sx={{ fontWeight: 600 }}>
            {personName(activity.actor)}
          </Box>{" "}
          {activityGroupText(group).map((part, i) => (
            <ActivityPart key={i} part={part} />
          ))}
        </Typography>
        <Timestamp iso={activity.createdAt} />
      </Box>
    </Box>
  );
}

/** One piece of an activity sentence: plain, bold, a tag chip, or a priority with its icon. */
function ActivityPart({ part }: { part: TextPart }) {
  if (part.tag) {
    return (
      <Box component="span" sx={{ display: "inline-block", verticalAlign: "middle", my: 0.25 }}>
        <TagChip tag={part.tag} />
      </Box>
    );
  }
  if (part.priority) {
    return (
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          verticalAlign: "bottom",
          fontWeight: 600,
        }}
      >
        <PriorityIcon priority={part.priority} decorative />
        {part.text}
      </Box>
    );
  }
  if (part.strong) {
    return (
      <Box component="span" sx={{ fontWeight: 600 }}>
        {part.text}
      </Box>
    );
  }
  return <span>{part.text}</span>;
}
