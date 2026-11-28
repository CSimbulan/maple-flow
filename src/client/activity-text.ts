import type { ActivityFieldsFragment } from "@/gql/graphql";
import { PRIORITY_LABELS, type Priority } from "@/lib/priority";

/**
 * A piece of an activity sentence. `strong` pieces are names and values, shown in bold; a
 * `tag` piece shows as the tag's chip and a `priority` piece with its icon. `text` is always
 * the plain wording.
 */
export type TextPart = {
  text: string;
  strong?: boolean;
  tag?: { name: string; color: string };
  priority?: Priority;
};

type Person = { name: string | null; email: string };
type Tag = { name: string; color: string };
type Activity = Pick<ActivityFieldsFragment, "kind" | "from" | "to"> & {
  addedTags: Tag[];
  removedTags: Tag[];
  addedUsers: Person[];
  removedUsers: Person[];
};

const plain = (text: string): TextPart => ({ text });
const strong = (text: string): TextPart => ({ text, strong: true });

/** "A", "A and B", "A, B and C". */
function joined(items: TextPart[]): TextPart[] {
  return items.flatMap((item, i) => [
    ...(i === 0 ? [] : [plain(i === items.length - 1 ? " and " : ", ")]),
    item,
  ]);
}

const names = (items: string[]) => joined(items.map(strong));

/** YYYY-MM-DD as a local date, e.g. "Dec 3, 2026" (no time zone shift). */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A priority as a bold name with its icon (or plain bold text if it isn't one we know). */
const priority = (p: string): TextPart =>
  p in PRIORITY_LABELS
    ? { text: PRIORITY_LABELS[p as Priority], strong: true, priority: p as Priority }
    : strong(p);
const userName = (u: Person) => u.name ?? u.email;

/** "set the X to B", "changed the X from A to B" or "removed the X (was A)". */
function valueChange(what: string, from: TextPart | null, to: TextPart | null): TextPart[] {
  if (!from && to) return [plain(`set the ${what} to `), to];
  if (from && !to) return [plain(`removed the ${what} (was `), from, plain(")")];
  return [plain(`changed the ${what} from `), from ?? strong(""), plain(" to "), to ?? strong("")];
}

/** Two halves joined with "and", e.g. "added tag Bug and removed tag UX/UI". */
function addedRemoved(added: TextPart[] | null, removed: TextPart[] | null): TextPart[] {
  if (added && removed) return [...added, plain(" and "), ...removed];
  return added ?? removed ?? [];
}

/** What the actor did, after their name: "moved this card from To do to Doing". */
export function activityText(a: Activity): TextPart[] {
  switch (a.kind) {
    case "CREATED":
      return [plain("created this card in "), strong(a.to ?? "a list")];
    case "RENAMED":
      return [
        plain("renamed this card from "),
        strong(a.from ?? ""),
        plain(" to "),
        strong(a.to ?? ""),
      ];
    case "DESCRIPTION":
      return [plain("changed the description")];
    case "TAGS": {
      const tags = (verb: string, list: Tag[]) =>
        list.length
          ? [
              plain(`${verb} ${list.length === 1 ? "tag" : "tags"} `),
              ...joined(list.map((tag) => ({ text: tag.name, tag }))),
            ]
          : null;
      return addedRemoved(tags("added", a.addedTags), tags("removed", a.removedTags));
    }
    case "DUE_DATE":
      return valueChange(
        "due date",
        a.from ? strong(formatDay(a.from)) : null,
        a.to ? strong(formatDay(a.to)) : null,
      );
    case "PRIORITY":
      return valueChange(
        "priority",
        a.from ? priority(a.from) : null,
        a.to ? priority(a.to) : null,
      );
    case "ASSIGNEES": {
      const people = (verb: string, list: Person[]) =>
        list.length ? [plain(`${verb} `), ...names(list.map(userName))] : null;
      const text = addedRemoved(
        people("assigned", a.addedUsers),
        people("unassigned", a.removedUsers),
      );
      // Everyone involved has since been deleted.
      return text.length ? text : [plain("changed the assignees")];
    }
    case "MOVED":
      return [
        plain("moved this card from "),
        strong(a.from ?? ""),
        plain(" to "),
        strong(a.to ?? ""),
      ];
    case "ARCHIVED":
      return [plain("archived this card")];
    case "RESTORED":
      return [plain("restored this card to "), strong(a.to ?? "a list")];
  }
}

/**
 * Consecutive entries by the same person at the same moment (one save changing several fields)
 * as one group, so they read as one sentence. `entries` must be oldest first.
 */
export function groupActivity<T extends { createdAt: string; actor: { id: string } | null }>(
  entries: T[],
): T[][] {
  const groups: T[][] = [];
  for (const entry of entries) {
    const last = groups.at(-1)?.[0];
    if (last && last.createdAt === entry.createdAt && last.actor?.id === entry.actor?.id) {
      groups.at(-1)!.push(entry);
    } else {
      groups.push([entry]);
    }
  }
  return groups;
}

/** A group's entries as one sentence, separated by commas. */
export function activityGroupText(group: Activity[]): TextPart[] {
  const created = group[0]?.kind === "CREATED";
  return group.flatMap((a, i) => [
    ...(i === 0 ? [] : [plain(", ")]),
    // A new card's description is its first, not a change.
    ...(created && a.kind === "DESCRIPTION" ? [plain("added a description")] : activityText(a)),
  ]);
}
