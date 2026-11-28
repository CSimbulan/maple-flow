# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Maple Flow: a Trello-style app (workspaces → projects → boards → lists → cards) on Next.js 16
(App Router), GraphQL (Yoga + Pothos), Apollo Client 4, MongoDB (Mongoose 9), Auth.js 5 (beta),
Material UI 9 and dnd-kit. Package manager is **npm** (pnpm isn't installed). Repo:
`CSimbulan/maple-flow`, default branch `master`.

## Commands

```bash
npm run dev            # next dev on :3000, using MONGODB_URI from .env.local (live Atlas data)
npm run dev:memory     # next dev against a throwaway in-memory MongoDB, dev login on; PORT=… to change port
npm test               # Vitest: unit tests + GraphQL API tests (in-memory MongoDB)
npx vitest run test/graphql.test.ts -t "restores a card"   # one file / one test by name
npm run test:e2e       # Playwright (needs `npx playwright install chromium` once); starts dev:memory on :3100
npm run lint           # ESLint (next + prettier config)
npm run typecheck      # tsc --noEmit
npm run format         # Prettier (printWidth 100)
npm run codegen        # print schema.graphql from Pothos, then regenerate src/gql/
```

Run `npm run codegen` after changing the GraphQL schema (`src/server/graphql/`) or any operation
in `src/client/operations.ts`. `schema.graphql` and `src/gql/` are generated and committed.

### Environment

`.env.local` (template: `.env.example`): `MONGODB_URI` (Atlas; include the database name),
`AUTH_SECRET`, optional `AUTH_GITHUB_*` / `AUTH_GOOGLE_*`, and `AUTH_DEV_LOGIN="true"` for an
email-only sign-in that is ignored in production. **`npm run dev` reads and writes the live Atlas
database**; use `npm run dev:memory` (or the tests) for experiments. `dev:memory` sets
`MONGODB_URI`, `AUTH_DEV_LOGIN` and a random `AUTH_SECRET` in the process env, which wins over
`.env.local`.

### Dev server gotchas

- Next allows only one `next dev` per project folder (lock in `.next/dev`). Playwright's
  `webServer` starts another one, so stop the running dev server first (or run Playwright from a
  copy of the project).
- Avoid `next build` while `next dev` is running, and restart dev (optionally deleting `.next`)
  after many edits to theme/layout files: stale hot-reload state has caused hydration mismatches
  that a fresh server doesn't have.
- On Windows a running dev server locks `src/app` route folders, so moving/renaming them fails
  until it's stopped.

## Architecture

### Layers

- `src/server/graphql/` is framework-free (relative imports, no `next/*`).
  `createGraphQLServer({ getUserId })` in `yoga.ts` builds Yoga; `src/app/api/graphql/route.ts`
  plugs in Auth.js's session. Keep it that way so the API can move to a standalone server.
- `src/server/db/`: Mongoose connection, models, `cascade.ts` (permanent deletes of
  projects → boards → lists → cards) and `workspace.ts` (`ensureWorkspace`, `createOrganization`).
- `src/server/auth/`: Auth.js with JWT sessions. There's no DB adapter (it needs MongoDB driver 6;
  Mongoose 9 ships 7): the `jwt` callback upserts the user by email and stores its id as `uid`.
  Server components call `requireUser()`.
- `src/client/`: Apollo operations, components, drag-and-drop helpers. `src/lib/` is shared by
  both sides (fractional positions, cookie name).

### GraphQL schema (Pothos)

- `buildSchema()` creates a **fresh builder every time `schema.ts` loads**
  (`createBuilder()` in `builder.ts`). A module-level builder survived Next hot reloads and threw
  "Duplicate field" → every request 500'd. Don't move the builder back to module scope.
- `types.ts` defines object types, `schema.ts` boards/lists/cards, `workspaces.ts`
  workspaces/projects (added with `queryFields`/`mutationFields`).
- Per-request DataLoaders live in `context.ts`. After a write, resolvers return fresh docs via
  `reloadBoard` / `reloadOrg`, which clear the affected loaders.
- Mutations that change a collection return the **parent** with the new array (e.g. `createCard`
  returns the list, `moveCard` returns both lists, `restoreCard` returns card + list + board).
  The client relies on this instead of manual cache writes; arrays use `merge: false` in the
  Apollo `typePolicies` (`src/client/apollo/client.ts`).
- Validation is plain Zod inside resolvers via `parse()` → `BAD_USER_INPUT`.
- Card comments and activity live in `comments.ts` (types, `Card.comments`/`activity`, `card`
  query) and `activity.ts`. Card mutations call `logActivity` with entries from `cardChanges` /
  `creationEntries`; one call shares a `createdAt`, which the client uses to show a save's
  changes as one sentence (`groupActivity` in `src/client/activity-text.ts`). Entries copy list
  and tag names in. Reorders within a list and side effects of board-level actions (tag deletes,
  member removal, list archiving) aren't logged. Deleting cards/lists/boards must also delete
  their comments and activity (`deleteCardHistory`, `deleteBoards`).

### Naming: workspace vs organization

The API and UI say **Workspace**; MongoDB stores them as `organizations` (`OrganizationModel`,
`OrganizationDoc`) and projects reference them by `orgId`. Server helpers (`requireOrgMember`,
`orgOfBoard`) and some client files (`OrgSettings.tsx`, `current-org.tsx`) keep the old name.
Routes live under `/w/[orgId]/…`; `next.config.ts` redirects old `/o/…` links.

### Access rules (`src/server/graphql/permissions.ts`)

- Workspace members can open every board in its projects; a board's `memberIds` are its
  **guests** (invited via Share) plus, for legacy boards, the creator.
- Any member can add people, projects and boards; only the workspace owner renames/deletes it,
  removes members or deletes projects; members can leave, the owner can't.
- A board's creator (`ownerId`) and the workspace owner can delete it and remove guests
  (`viewerCanManage`).
- Anything the caller can't open is reported as `NOT_FOUND`, never `FORBIDDEN`, so ids don't
  leak. Removing someone also unassigns them from cards they can no longer open.

### Workspace bootstrap and migration

`/boards` (where sign-in and `/` land) runs `ensureWorkspace(userId)`: a user without a workspace
gets one named "Personal" with a "General" project, and boards from before projects existed
(`projectId: null`) move into the owner's workspace, keeping guests. Then it redirects to the
workspace in the `mf-org` cookie (if still a member) or the first one.

Other lazy migrations: boards with no `tags` field get `DEFAULT_TAGS` (`src/lib/tags.ts`) the
first time their tags are read (`tagsOf` in `graphql/tags.ts`; an empty array means the user
deleted them all), and lists with no `color` get `defaultListColor(index)` when their board
loads. Cards carry `tagIds` into their board's embedded `tags`; the old color `labels` were
replaced by tags and are no longer read.

### Ordering and drag and drop

- Lists and cards have a fractional-index `position` string (`src/lib/position.ts`). Moves send
  neighbor ids (`beforeId`/`afterId`); the server computes the key (`positionIn`), rebalancing
  the group if keys collide. Compare positions with plain `<`/`>` (MongoDB's binary order), not
  `localeCompare`.
- `src/client/board-moves.ts` computes the same position for optimistic responses (unit tested).
- `BoardView.tsx`: dnd-kit with Mouse + Touch sensors (touch drag starts after a 200 ms
  long-press so swipes scroll). Drag order is local state; after a drop it's held in `pending`
  until the mutation settles. Falling back to the cache immediately made the drop animation fly
  back to the card's old spot.
- Lists and cards drag only by their grip icon (`DragHandle`, which carries dnd-kit's
  `listeners` and activator ref); clicking a card opens it. Don't put the listeners on an element
  that contains menus or dialogs: key events from portals bubble up the React tree to it and
  start a keyboard drag. The e2e test drags by the "Drag card …" grip.

### Client data and rendering

- Apollo lives in `AppFrame` with **one client per signed-in user** (`getApolloClient(userId)`).
  Sign-out/in is a client-side navigation, so a shared cache showed the next user the previous
  user's data.
- Client components also render on the server with a never-resolving link, so pages show their
  loading state and fetch in the browser (no SSR data).
- Codegen uses the client preset with fragment masking off; import typed documents from
  `src/client/operations.ts`.
- Brand colors are in `src/brand.ts`; every color behind white text keeps ≥4.5:1 contrast.

## Library gotchas (versions newer than most training data)

- **MUI 9**: system props (`fontWeight=`, `alignItems=` on Typography/Stack) are gone, so use `sx`.
  `color=` on `Typography component={Link}` doesn't apply; put it in `sx`. Several icons were
  renamed (`DeleteOutlined`, `PeopleOutlined`, not `…Outline`). App Router cache provider comes
  from `@mui/material-nextjs/v16-appRouter`. Render interactive MUI (Tooltip, Avatar menus) from
  client components; rendering them from server components caused hydration mismatches.
- **Apollo Client 4**: hooks come from `@apollo/client/react`.
- **Mongoose 9**: models use explicit TypeScript interfaces; `InferSchemaType` made `tsc` run out
  of memory. Use `{ returnDocument: "after" }`.
- **graphql** is pinned to 16. Vitest inlines `@pothos/*` (`vitest.config.mts`); otherwise Pothos
  loads the CJS build of graphql and the schema fails with "another module or realm".
- **Zod 4**: `z.email()`, `z.iso.date()`, `z.prettifyError()`.
- A server component can't import a plain constant from a `"use client"` module (it gets a client
  reference); shared constants go in `src/lib/`.

## Tests

- `test/graphql.test.ts` runs the real schema against mongodb-memory-server through
  `graphql()` with `createContext(userId)`; helpers `projectOf`, `orgOf`, `newBoard`,
  `addCards`, `cardId`, `errorCode` set up users Ann and Bob. The first run downloads a MongoDB
  binary.
- `e2e/board.spec.ts` signs in with the dev login, opens the General project, creates a board and
  drags cards. Label lookups need `{ exact: true }` (e.g. "List Doing" vs "Drag list Doing").

## Repository workflow

- No CI on GitHub: run `npm run lint`, `npm run typecheck` and `npm test` before pushing.
- The owner's flow so far: commit on a short-lived branch, fast-forward `master`, push, delete
  the branch.
- `.gitattributes` forces LF (Prettier writes LF; Windows checkouts otherwise show every file as
  changed).
