import { describe, expect, it } from "vitest";
import { activityGroupText, activityText, groupActivity } from "./activity-text";

const base = {
  from: null,
  to: null,
  addedTags: [],
  removedTags: [],
  addedUsers: [],
  removedUsers: [],
};
const tag = (name: string) => ({ name, color: "#c62828" });
const say = (a: Partial<Parameters<typeof activityText>[0]>) =>
  activityText({ ...base, kind: "CREATED", ...a })
    .map((p) => (p.strong ? `*${p.text}*` : p.text))
    .join("");

describe("activityText", () => {
  it("describes moves and creation with list names", () => {
    expect(say({ kind: "MOVED", from: "To do", to: "Doing" })).toBe(
      "moved this card from *To do* to *Doing*",
    );
    expect(say({ kind: "CREATED", to: "To do" })).toBe("created this card in *To do*");
  });

  it("lists added and removed tags and people", () => {
    expect(
      say({
        kind: "TAGS",
        addedTags: [tag("Bug")],
        removedTags: [tag("UX/UI"), tag("Docs"), tag("Test")],
      }),
    ).toBe("added tag Bug and removed tags UX/UI, Docs and Test");
    const [, chip] = activityText({ ...base, kind: "TAGS", addedTags: [tag("Bug")] });
    expect(chip.tag).toEqual(tag("Bug"));
    const user = (name: string) => ({ name, email: `${name}@x.com` });
    expect(say({ kind: "ASSIGNEES", addedUsers: [user("Ann"), user("Bob")] })).toBe(
      "assigned *Ann* and *Bob*",
    );
    expect(say({ kind: "ASSIGNEES" })).toBe("changed the assignees");
  });

  it("describes set, changed and removed values", () => {
    expect(say({ kind: "PRIORITY", to: "HIGHEST" })).toBe("set the priority to *Highest*");
    expect(say({ kind: "PRIORITY", from: "LOW", to: "MEDIUM" })).toBe(
      "changed the priority from *Low* to *Medium*",
    );
    expect(say({ kind: "PRIORITY", from: "LOW" })).toBe("removed the priority (was *Low*)");
    expect(activityText({ ...base, kind: "PRIORITY", to: "HIGH" })[1].priority).toBe("HIGH");
    expect(say({ kind: "DUE_DATE", to: "2026-12-03" })).toMatch(
      /^set the due date to \*.*3.*2026\*$/,
    );
  });
});

describe("groupActivity", () => {
  const at = (createdAt: string, actor: string, kind: "MOVED" | "ARCHIVED" = "ARCHIVED") => ({
    ...base,
    kind,
    from: "A",
    to: "B",
    createdAt,
    actor: { id: actor },
  });

  it("groups consecutive entries by the same person at the same moment", () => {
    const t1 = "2026-11-27T10:00:00.000Z";
    const t2 = "2026-11-27T10:00:00.001Z";
    const entries = [at(t1, "ann"), at(t1, "ann"), at(t1, "bob"), at(t2, "bob"), at(t2, "bob")];
    expect(groupActivity(entries).map((g) => g.length)).toEqual([2, 1, 2]);
  });

  it("joins a group's sentences with commas", () => {
    const t = "2026-11-27T10:00:00.000Z";
    const text = activityGroupText([at(t, "ann", "MOVED"), at(t, "ann")])
      .map((p) => p.text)
      .join("");
    expect(text).toBe("moved this card from A to B, archived this card");
  });
});

describe("activityGroupText for a new card", () => {
  it("lists the details it started with after creating it", () => {
    const entry = (a: Partial<Parameters<typeof activityText>[0]>) => ({
      ...base,
      kind: "CREATED" as const,
      ...a,
    });
    const text = activityGroupText([
      entry({ kind: "CREATED", to: "To do" }),
      entry({ kind: "DESCRIPTION" }),
      entry({ kind: "TAGS", addedTags: [tag("Bug")] }),
      entry({ kind: "PRIORITY", to: "HIGH" }),
    ])
      .map((p) => p.text)
      .join("");
    expect(text).toBe(
      "created this card in To do, added a description, added tag Bug, set the priority to High",
    );
  });
});
