import type { ApolloCache } from "@apollo/client";

/**
 * After a workspace's members change, forget who can open each cached board, so the next time
 * a board shows (or right away, if one is showing) its members and guests are fetched again.
 * A board's members include everyone in its workspace, so the workspace mutation's own response
 * can't update them.
 *
 * Removing someone also unassigns them from cards they can no longer open, so pass
 * `assignees: true` then to refetch cards' assignees too.
 */
export function forgetBoardAudiences(cache: ApolloCache, { assignees = false } = {}) {
  for (const id of Object.keys(cache.extract() as Record<string, unknown>)) {
    if (id.startsWith("Board:")) {
      cache.evict({ id, fieldName: "members" });
      cache.evict({ id, fieldName: "guests" });
    } else if (assignees && id.startsWith("Card:")) {
      cache.evict({ id, fieldName: "assignees" });
    }
  }
  cache.gc();
}
