import type { Types } from "mongoose";
import { ActivityModel, type ActivityDoc, type CardDoc, type TagDoc } from "../db/models";
import type { Context } from "./context";
import { requireUserId } from "./permissions";

/** An activity entry before it's stored: the kind plus whichever details it uses. */
export type ActivityEntry = Pick<ActivityDoc, "kind"> &
  Partial<Pick<ActivityDoc, "from" | "to" | "added" | "removed" | "tagColors">>;

/** Record what the signed-in user did to a card. */
export async function logActivity(
  ctx: Context,
  card: { _id: Types.ObjectId; boardId: Types.ObjectId },
  entries: ActivityEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const actorId = requireUserId(ctx);
  // One shared time, so the feed can show changes made in the same save as one entry.
  const createdAt = new Date();
  await ActivityModel.insertMany(
    entries.map((e) => ({ ...e, cardId: card._id, boardId: card.boardId, actorId, createdAt })),
  );
}

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** Ids in `next` but not `prev`, and the other way round. */
function diffIds(prev: { toString(): string }[], next: { toString(): string }[]) {
  const before = new Set(prev.map(String));
  const after = new Set(next.map(String));
  return {
    added: [...after].filter((id) => !before.has(id)),
    removed: [...before].filter((id) => !after.has(id)),
  };
}

/**
 * Entries describing an updateCard: one per field that actually changed. `$set` is what is
 * about to be stored; `tags` are the board's tags, to record tag names rather than ids.
 */
export function cardChanges(
  card: Pick<CardDoc, "title" | "description" | "tagIds" | "dueDate" | "priority" | "assigneeIds">,
  $set: Record<string, unknown>,
  tags: TagDoc[],
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  if (typeof $set.title === "string" && $set.title !== card.title) {
    entries.push({ kind: "RENAMED", from: card.title, to: $set.title });
  }
  if (typeof $set.description === "string" && $set.description !== card.description) {
    entries.push({ kind: "DESCRIPTION" });
  }
  if (Array.isArray($set.tagIds)) {
    const { added, removed } = diffIds(card.tagIds ?? [], $set.tagIds as string[]);
    if (added.length || removed.length) {
      const tagOf = (id: string) => tags.find((t) => t._id.toString() === id);
      const nameOf = (id: string) => tagOf(id)?.name ?? "a tag";
      entries.push({
        kind: "TAGS",
        added: added.map(nameOf),
        removed: removed.map(nameOf),
        // Kept with the names, so the feed can show the chips as they looked then.
        tagColors: [...added, ...removed].flatMap((id) => {
          const tag = tagOf(id);
          return tag ? [{ name: tag.name, color: tag.color }] : [];
        }),
      });
    }
  }
  if ("dueDate" in $set) {
    const from = day(card.dueDate);
    const to = day($set.dueDate as Date | null);
    if (from !== to) entries.push({ kind: "DUE_DATE", from, to });
  }
  if ("priority" in $set) {
    const from = card.priority ?? null;
    const to = ($set.priority as string | null) ?? null;
    if (from !== to) entries.push({ kind: "PRIORITY", from, to });
  }
  if (Array.isArray($set.assigneeIds)) {
    const { added, removed } = diffIds(card.assigneeIds, $set.assigneeIds as string[]);
    if (added.length || removed.length) entries.push({ kind: "ASSIGNEES", added, removed });
  }
  return entries;
}

/**
 * Entries for a new card: "created" first, then each detail it started with, as if set on a
 * blank card. They're logged together, so the feed shows them as one sentence.
 */
export function creationEntries(
  listTitle: string,
  $set: Record<string, unknown>,
  tags: TagDoc[],
): ActivityEntry[] {
  const blank = {
    title: "",
    description: "",
    tagIds: [],
    dueDate: null,
    priority: null,
    assigneeIds: [],
  };
  return [{ kind: "CREATED", to: listTitle }, ...cardChanges(blank, $set, tags)];
}
