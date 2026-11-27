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
        },
      },
      List: { fields: { cards: { merge: false } } },
      Card: { fields: { assignees: { merge: false }, labels: { merge: false } } },
    },
  });
}

let browserClient: ApolloClient | undefined;

/**
 * Client components also render on the server. There, use a throwaway client whose link never
 * resolves, so pages render their loading state and fetch in the browser. In the browser, share one
 * client for the whole session.
 */
export function getApolloClient(): ApolloClient {
  if (typeof window === "undefined") {
    return new ApolloClient({
      ssrMode: true,
      link: new ApolloLink(() => new Observable(() => {})),
      cache: makeCache(),
    });
  }
  browserClient ??= new ApolloClient({
    link: new HttpLink({ uri: "/api/graphql", credentials: "same-origin" }),
    cache: makeCache(),
  });
  return browserClient;
}
