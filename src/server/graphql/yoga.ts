import { createYoga } from "graphql-yoga";
import { connectDb } from "../db/connect";
import { createContext } from "./context";
import { schema } from "./schema";

/**
 * Framework-agnostic Yoga server. `getUserId` resolves the caller from the request,
 * so the same server can move to a standalone Node process later.
 */
export function createGraphQLServer(options: {
  endpoint: string;
  getUserId: (request: Request) => Promise<string | null>;
}) {
  return createYoga({
    schema,
    graphqlEndpoint: options.endpoint,
    graphiql: process.env.NODE_ENV !== "production",
    fetchAPI: { Response },
    context: async ({ request }) => {
      await connectDb();
      return createContext(await options.getUserId(request));
    },
  });
}
