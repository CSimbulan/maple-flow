import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { Observable } from "rxjs";

function makeCache() {
  return new InMemoryCache({
    typePolicies: {
      // Arrays come back complete from the server (or from optimistic responses), so replace them.
      Board: {
        fields: {
          lists: { merge: false },
          members: { merge: false },
          archivedCards: { merge: false },
          archivedLists: { merge: false },
          guests: { merge: false },
          tags: { merge: false },
        },
      },
      List: { fields: { cards: { merge: false } } },
      Workspace: { fields: { members: { merge: false }, projects: { merge: false } } },
      Project: { fields: { boards: { merge: false } } },
      Card: {
        fields: {
          assignees: { merge: false },
          tags: { merge: false },
          comments: { merge: false },
          activity: { merge: false },
        },
      },
      CardActivity: {
        fields: {
          addedTags: { merge: false },
          removedTags: { merge: false },
          addedUsers: { merge: false },
          removedUsers: { merge: false },
        },
      },
    },
  });
}

let browserClient: { userId: string; client: ApolloClient } | undefined;

/**
 * The Apollo client for the signed-in user `userId`.
 *
 * Client components also render on the server. There, use a throwaway client whose link never
 * resolves, so pages render their loading state and fetch in the browser.
 *
 * In the browser, each signed-in user gets their own client and cache. Signing out and in is a
 * client-side navigation, not a page load, so a single shared cache would show the next person
 * whatever the previous one had loaded (their workspaces, boards, cards).
 */
export function getApolloClient(userId: string): ApolloClient {
  if (typeof window === "undefined") {
    return new ApolloClient({
      ssrMode: true,
      link: new ApolloLink(() => new Observable(() => {})),
      cache: makeCache(),
    });
  }
  if (browserClient?.userId !== userId) {
    // A different person signed in: drop the previous user's cached data entirely.
    browserClient?.client.stop();
    void browserClient?.client.clearStore();
    browserClient = {
      userId,
      client: new ApolloClient({
        link: new HttpLink({ uri: "/api/graphql", credentials: "same-origin" }),
        cache: makeCache(),
      }),
    };
  }
  return browserClient.client;
}
