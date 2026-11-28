import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FEED_PREFS, readFeedPrefs, writeFeedPrefs } from "./feed-prefs";

// Tests run in Node, which has no localStorage: a minimal in-memory one.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  clear: () => store.clear(),
});

describe("feed prefs", () => {
  beforeEach(() => localStorage.clear());

  it("shows comments and activity, newest first, by default", () => {
    expect(readFeedPrefs()).toEqual({ showComments: true, showActivity: true, newestFirst: true });
  });

  it("remembers what was saved and ignores junk", () => {
    writeFeedPrefs({ ...DEFAULT_FEED_PREFS, showActivity: false, newestFirst: false });
    expect(readFeedPrefs()).toEqual({
      showComments: true,
      showActivity: false,
      newestFirst: false,
    });
    localStorage.setItem("mf-card-feed", '{"showComments":"no"}');
    expect(readFeedPrefs()).toEqual(DEFAULT_FEED_PREFS);
    localStorage.setItem("mf-card-feed", "not json");
    expect(readFeedPrefs()).toEqual(DEFAULT_FEED_PREFS);
  });
});
