/**
 * How a person likes the card feed (which entries show and their order). A per-browser view
 * setting kept in localStorage, so every card opens the same way. Nothing is sent to the server.
 */
export type FeedPrefs = { showComments: boolean; showActivity: boolean; newestFirst: boolean };

export const DEFAULT_FEED_PREFS: FeedPrefs = {
  showComments: true,
  showActivity: true,
  newestFirst: true,
};

const KEY = "mf-card-feed";

export function readFeedPrefs(): FeedPrefs {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const prefs = { ...DEFAULT_FEED_PREFS };
    if (stored && typeof stored === "object") {
      for (const key of Object.keys(prefs) as (keyof FeedPrefs)[]) {
        const value = (stored as Record<string, unknown>)[key];
        if (typeof value === "boolean") prefs[key] = value;
      }
    }
    return prefs;
  } catch {
    // Blocked or corrupt storage (or rendering on the server): use the defaults.
    return { ...DEFAULT_FEED_PREFS };
  }
}

export function writeFeedPrefs(prefs: FeedPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Can't save (private window, full storage): it still applies until the dialog closes.
  }
}
