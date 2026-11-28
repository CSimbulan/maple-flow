import type { ActivityFieldsFragment } from "@/gql/graphql";
import { PRIORITY_LABELS, type Priority } from "@/lib/priority";

/** A piece of an activity sentence; `strong` pieces are names and values, shown in bold. */
export type TextPart = { text: string; strong?: boolean };

type Person = { name: string | null; email: string };
type Activity = Pick<ActivityFieldsFragment, "kind" | "from" | "to" | "added" | "removed"> & {
  addedUsers: Person[];
  removedUsers: Person[];
};

const plain = (text: string): TextPart => ({ text });
const strong = (text: string): TextPart => ({ text, strong: true });

/** "A", "A and B", "A, B and C", each name bold. */
function names(items: string[]): TextPart[] {
  return items.flatMap((name, i) => [
    ...(i === 0 ? [] : [plain(i === items.length - 1 ? " and " : ", ")]),
    strong(name),
  ]);
}

/** YYYY-MM-DD as a local date, e.g. "Dec 3, 2026" (no time zone shift). */
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const priorityName = (p: string) => PRIORITY_LABELS[p as Priority] ?? p;
const userName = (u: Person) => u.name ?? u.email;

/** "set the X to B", "changed the X from A to B" or "removed the X". */
function valueChange(what: string, from: string | null, to: string | null): TextPart[] {
  if (!from && to) return [plain(`set the ${what} to `), strong(to)];
  if (from && !to) return [plain(`removed the ${what} (was `), strong(from), plain(")")];
  return [plain(`changed the ${what} from `), strong(from ?? ""), plain(" to "), strong(to ?? "")];
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
      const tags = (verb: string, list: string[]) =>
        list.length
          ? [plain(`${verb} ${list.length === 1 ? "tag" : "tags"} `), ...names(list)]
          : null;
      return addedRemoved(tags("added", a.added), tags("removed", a.removed));
    }
    case "DUE_DATE":
      return valueChange(
        "due date",
        a.from ? formatDay(a.from) : null,
        a.to ? formatDay(a.to) : null,
      );
    case "PRIORITY":
      return valueChange(
        "priority",
        a.from ? priorityName(a.from) : null,
        a.to ? priorityName(a.to) : null,
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
