import { auth } from "@/server/auth/config";
import { createGraphQLServer } from "@/server/graphql/yoga";

const yoga = createGraphQLServer({
  endpoint: "/api/graphql",
  getUserId: async () => (await auth())?.user?.id ?? null,
});

async function handle(request: Request) {
  return yoga.handleRequest(request, {});
}

export { handle as GET, handle as POST, handle as OPTIONS };
