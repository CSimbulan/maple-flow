# Maple Flow

A Trello-style project management app: boards, lists and cards with drag and drop, labels, due
dates, assignees and board sharing.

**Stack:** Next.js 16 (App Router) · TypeScript · GraphQL (Yoga + Pothos) · Apollo Client 4 ·
MongoDB (Mongoose) · Auth.js · Material UI 9 · dnd-kit

## Getting started

Requires Node 22.

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev                  # http://localhost:3000
```

To try the app without any setup, `npm run dev:memory` starts it against a throwaway in-memory
MongoDB with email-only dev login. Data is lost when it stops.

### MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access:** add a database user with a password.
3. **Network Access:** allow your IP address (and your host's, when you deploy).
4. **Connect → Drivers:** copy the connection string into `MONGODB_URI` in `.env.local`, with the
   password filled in and the database name before the `?`, for example
   `mongodb+srv://user:pass@cluster0.abcde.mongodb.net/maple-flow?retryWrites=true&w=majority`.

Collections and indexes are created automatically on first use.

### Sign-in

- `AUTH_SECRET` is required: generate one with `npx auth secret`, or use any 32+ random bytes in
  base64.
- **GitHub:** create an OAuth app (Settings → Developer settings) with the callback URL
  `http://localhost:3000/api/auth/callback/github`, then set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
- **Google:** create an OAuth client ID with the redirect URI
  `http://localhost:3000/api/auth/callback/google`, then set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
- **Dev login:** `AUTH_DEV_LOGIN="true"` adds an email-only sign-in. It never turns on when
  `NODE_ENV=production`.

A provider appears on the sign-in page only when its variables are set. When you deploy somewhere
other than Vercel, also set `AUTH_TRUST_HOST=true` and add the production callback URLs to your
OAuth apps.

## Scripts

| Command              | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `npm run dev`        | Dev server using `.env.local`                                              |
| `npm run dev:memory` | Dev server with an in-memory MongoDB and dev login                         |
| `npm run build`      | Production build                                                           |
| `npm test`           | Vitest: position math, optimistic moves, GraphQL API (in-memory DB)        |
| `npm run test:e2e`   | Playwright drag-and-drop test (run `npx playwright install chromium` once) |
| `npm run lint`       | ESLint                                                                     |
| `npm run typecheck`  | TypeScript                                                                 |
| `npm run codegen`    | Regenerate `schema.graphql` and the typed client in `src/gql/`             |

Run `npm run codegen` after changing the GraphQL schema (`src/server/graphql/`) or any operation in
`src/client/operations.ts`.

## How it's built

```
src/
  app/               routes: /signin, /boards, /b/[boardId], /api/graphql, /api/auth/*
  server/
    db/              Mongoose connection and models (User, Board, List, Card)
    auth/            Auth.js config; users are upserted into MongoDB at sign-in
    graphql/         Pothos schema, Yoga server, per-request DataLoaders, permission checks
  client/
    operations.ts    every query and mutation (typed by GraphQL Codegen)
    board-moves.ts   drag-and-drop state and optimistic responses
    components/      board UI (MUI + dnd-kit)
  lib/position.ts    fractional-index ordering shared by server and client
```

- **Ordering.** Lists and cards store a fractional-index `position` string. A move sends the ids of
  the new neighbors, and the server computes a key between them, so a drag updates one document.
  If two keys ever collide, the server renumbers that list.
- **Optimistic UI.** The client computes the same position and the server's exact response shape
  from the Apollo cache, so drops show instantly and roll back if the server rejects them.
  Mutations that change a collection return the parent (for example `createCard` returns the list
  with its cards), so the cache updates without manual cache writes.
- **Access control.** Every resolver checks that the caller is a member of the board. Boards you
  can't see are reported as "not found". Only the owner can delete a board or remove members.
- **Portable GraphQL.** `src/server/graphql` has no Next.js imports. `createGraphQLServer` takes a
  `getUserId(request)` function, so the API can move to a standalone Node server (for example to
  add real-time subscriptions) without changes.

## Not yet built

Real-time updates between users, an activity log, comments, attachments, search, and restoring
archived lists and cards.
