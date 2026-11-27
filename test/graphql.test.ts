import { graphql, type ExecutionResult } from "graphql";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "../src/server/db/connect";
import { BoardModel, CardModel, ListModel, UserModel } from "../src/server/db/models";
import { ensureWorkspace } from "../src/server/db/workspace";
import { createContext } from "../src/server/graphql/context";
import { schema } from "../src/server/graphql/schema";

let mongo: MongoMemoryServer;
let ann: string;
let bob: string;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri("maple-flow-test"));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  ann = (await UserModel.create({ email: "ann@example.com", name: "Ann" }))._id.toString();
  bob = (await UserModel.create({ email: "bob@example.com", name: "Bob" }))._id.toString();
});

/** Run an operation as `userId`; throws on GraphQL errors unless `allowErrors`. */
async function run<T = any>( // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string | null,
  source: string,
  variableValues: Record<string, unknown> = {},
): Promise<T> {
  const result = (await graphql({
    schema,
    source,
    variableValues,
    contextValue: createContext(userId),
  })) as ExecutionResult<T>;
  if (result.errors?.length) throw result.errors[0];
  return result.data as T;
}

async function errorCode(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return (err as { extensions?: { code?: string } }).extensions?.code;
  }
  throw new Error("Expected an error");
}

const BOARD = /* GraphQL */ `
  query ($id: ID!) {
    board(id: $id) {
      id
      title
      members {
        id
      }
      lists {
        id
        title
        cards {
          id
          title
          position
          assignees {
            id
          }
          dueDate
        }
      }
    }
  }
`;

/** The user's first project, creating their personal workspace if needed. */
async function projectOf(userId = ann): Promise<string> {
  await ensureWorkspace(userId);
  const data = await run(userId, `{ workspaces { projects { id } } }`);
  return data.workspaces[0].projects[0].id;
}

async function orgOf(userId = ann): Promise<string> {
  await ensureWorkspace(userId);
  return (await run(userId, `{ workspaces { id } }`)).workspaces[0].id;
}

async function newBoard(userId = ann, projectId?: string) {
  const data = await run(
    userId,
    `mutation ($p: ID!) { createBoard(projectId: $p, title: "Launch") { id lists { id title } } }`,
    { p: projectId ?? (await projectOf(userId)) },
  );
  return data.createBoard as { id: string; lists: { id: string; title: string }[] };
}

const PROJECT_BOARDS = `query ($p: ID!) { project(id: $p) { boards { id } } }`;

async function addCards(userId: string, listId: string, titles: string[]) {
  for (const title of titles) {
    await run(
      userId,
      `mutation ($l: ID!, $t: String!) { createCard(listId: $l, title: $t) { id } }`,
      {
        l: listId,
        t: title,
      },
    );
  }
}

async function cardTitles(boardId: string, userId = ann) {
  const { board } = await run(userId, BOARD, { id: boardId });
  return Object.fromEntries(
    board.lists.map((l: { title: string; cards: { title: string }[] }) => [
      l.title,
      l.cards.map((c) => c.title),
    ]),
  );
}

async function cardId(boardId: string, title: string) {
  const { board } = await run(ann, BOARD, { id: boardId });
  for (const l of board.lists)
    for (const c of l.cards) if (c.title === title) return c.id as string;
  throw new Error(`No card ${title}`);
}

describe("boards", () => {
  it("creates a board with default lists, visible only to members", async () => {
    const board = await newBoard();
    expect(board.lists.map((l) => l.title)).toEqual(["To do", "Doing", "Done"]);

    const p = await projectOf(ann);
    expect((await run(ann, PROJECT_BOARDS, { p })).project.boards).toHaveLength(1);
    expect((await run(bob, PROJECT_BOARDS, { p })).project).toBeNull();
    expect((await run(bob, BOARD, { id: board.id })).board).toBeNull();
  });

  it("requires sign-in", async () => {
    expect(await errorCode(run(null, `{ workspaces { id } }`))).toBe("UNAUTHENTICATED");
  });

  it("hides boards from non-members on mutations", async () => {
    const board = await newBoard();
    const code = await errorCode(
      run(bob, `mutation ($b: ID!) { createList(boardId: $b, title: "x") { id } }`, {
        b: board.id,
      }),
    );
    expect(code).toBe("NOT_FOUND");
  });

  it("validates input", async () => {
    const code = await errorCode(
      run(ann, `mutation ($p: ID!) { createBoard(projectId: $p, title: "   ") { id } }`, {
        p: await projectOf(ann),
      }),
    );
    expect(code).toBe("BAD_USER_INPUT");
  });
});

describe("ordering", () => {
  it("moves cards between lists and within a list", async () => {
    const board = await newBoard();
    const [todo, doing] = board.lists;
    await addCards(ann, todo.id, ["A", "B", "C"]);
    await addCards(ann, doing.id, ["D"]);

    const MOVE = `mutation ($id: ID!, $to: ID!, $before: ID, $after: ID) {
      moveCard(id: $id, toListId: $to, beforeId: $before, afterId: $after) {
        fromList { cards { title } } toList { cards { title } }
      }
    }`;

    // B to the top of Doing, above D.
    const moved = await run(ann, MOVE, {
      id: await cardId(board.id, "B"),
      to: doing.id,
      after: await cardId(board.id, "D"),
    });
    expect(moved.moveCard.fromList.cards.map((c: { title: string }) => c.title)).toEqual([
      "A",
      "C",
    ]);
    expect(moved.moveCard.toList.cards.map((c: { title: string }) => c.title)).toEqual(["B", "D"]);

    // C to the top of To do, above A.
    await run(ann, MOVE, {
      id: await cardId(board.id, "C"),
      to: todo.id,
      after: await cardId(board.id, "A"),
    });
    // A into the empty Done list.
    await run(ann, MOVE, { id: await cardId(board.id, "A"), to: board.lists[2].id });

    expect(await cardTitles(board.id)).toEqual({ "To do": ["C"], Doing: ["B", "D"], Done: ["A"] });
  });

  it("rejects neighbors from another list", async () => {
    const board = await newBoard();
    const [todo, doing] = board.lists;
    await addCards(ann, todo.id, ["A", "B"]);
    const code = await errorCode(
      run(
        ann,
        `mutation ($id: ID!, $to: ID!, $b: ID) { moveCard(id: $id, toListId: $to, beforeId: $b) { card { id } } }`,
        {
          id: await cardId(board.id, "A"),
          to: doing.id,
          b: await cardId(board.id, "B"),
        },
      ),
    );
    expect(code).toBe("BAD_USER_INPUT");
  });

  it("reorders lists", async () => {
    const board = await newBoard();
    const [todo, , done] = board.lists;
    const data = await run(
      ann,
      `mutation ($id: ID!, $after: ID) { moveList(id: $id, afterId: $after) { lists { title } } }`,
      { id: done.id, after: todo.id },
    );
    expect(data.moveList.lists.map((l: { title: string }) => l.title)).toEqual([
      "Done",
      "To do",
      "Doing",
    ]);
  });

  it("recovers from duplicate positions by rebalancing", async () => {
    const board = await newBoard();
    const [todo] = board.lists;
    await addCards(ann, todo.id, ["A", "B", "C"]);
    // Simulate two concurrent inserts that picked the same key.
    await CardModel.updateMany({ title: { $in: ["B", "C"] } }, { $set: { position: "a1" } });
    const [b, c] = [await cardId(board.id, "B"), await cardId(board.id, "C")];
    const ordered = (await cardTitles(board.id))["To do"] as string[];
    const [first, second] = ordered.slice(1);
    await run(
      ann,
      `mutation ($id: ID!, $to: ID!, $before: ID, $after: ID) { moveCard(id: $id, toListId: $to, beforeId: $before, afterId: $after) { card { id } } }`,
      {
        id: await cardId(board.id, "A"),
        to: todo.id,
        before: first === "B" ? b : c,
        after: second === "B" ? b : c,
      },
    );
    const cards = await CardModel.find({ listId: todo.id }).lean();
    expect(new Set(cards.map((x) => x.position)).size).toBe(3);
    expect((await cardTitles(board.id))["To do"]).toEqual([first, "A", second]);
  });
});

describe("sharing and cards", () => {
  it("adds and removes members", async () => {
    const board = await newBoard();
    const ADD = `mutation ($b: ID!, $e: String!) { addBoardMember(boardId: $b, email: $e) { members { id } } }`;

    expect(await errorCode(run(ann, ADD, { b: board.id, e: "nobody@example.com" }))).toBe(
      "BAD_USER_INPUT",
    );
    const added = await run(ann, ADD, { b: board.id, e: "BOB@example.com" });
    expect(added.addBoardMember.members).toHaveLength(2);
    expect((await run(bob, BOARD, { id: board.id })).board.title).toBe("Launch");

    const REMOVE = `mutation ($b: ID!, $u: ID!) { removeBoardMember(boardId: $b, userId: $u) { members { id } } }`;
    expect(await errorCode(run(bob, REMOVE, { b: board.id, u: ann }))).toBe("FORBIDDEN");
    expect(await errorCode(run(ann, REMOVE, { b: board.id, u: ann }))).toBe("FORBIDDEN");

    await addCards(ann, board.lists[0].id, ["Task"]);
    const task = await cardId(board.id, "Task");
    await run(
      ann,
      `mutation ($id: ID!, $a: [ID!]) { updateCard(id: $id, assigneeIds: $a) { id } }`,
      {
        id: task,
        a: [bob],
      },
    );
    await run(ann, REMOVE, { b: board.id, u: bob });
    expect((await run(bob, BOARD, { id: board.id })).board).toBeNull();
    const { board: after } = await run(ann, BOARD, { id: board.id });
    expect(after.lists[0].cards[0].assignees).toEqual([]);
  });

  it("updates card details", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["Task"]);
    const id = await cardId(board.id, "Task");
    const UPDATE = `mutation ($id: ID!, $due: String, $labels: [String!], $a: [ID!]) {
      updateCard(id: $id, dueDate: $due, labels: $labels, assigneeIds: $a) { dueDate labels assignees { id } }
    }`;

    const set = await run(ann, UPDATE, { id, due: "2026-12-24", labels: ["red", "red", "blue"] });
    expect(set.updateCard.dueDate).toBe("2026-12-24T00:00:00.000Z");
    expect(set.updateCard.labels).toEqual(["red", "blue"]);

    // Leaving dueDate out keeps it; passing null clears it.
    const kept = await run(ann, UPDATE, { id, labels: [] });
    expect(kept.updateCard.dueDate).toBe("2026-12-24T00:00:00.000Z");
    const cleared = await run(ann, UPDATE, { id, due: null });
    expect(cleared.updateCard.dueDate).toBeNull();

    expect(await errorCode(run(ann, UPDATE, { id, a: [bob] }))).toBe("BAD_USER_INPUT");
    expect(await errorCode(run(ann, UPDATE, { id, labels: ["pink"] }))).toBe("BAD_USER_INPUT");
  });

  it("archives cards and lists", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A", "B"]);
    await run(ann, `mutation ($id: ID!) { archiveCard(id: $id) { id } }`, {
      id: await cardId(board.id, "A"),
    });
    expect((await cardTitles(board.id))["To do"]).toEqual(["B"]);
    const data = await run(
      ann,
      `mutation ($id: ID!) { archiveList(id: $id) { lists { title } } }`,
      {
        id: board.lists[0].id,
      },
    );
    expect(data.archiveList.lists.map((l: { title: string }) => l.title)).toEqual([
      "Doing",
      "Done",
    ]);
  });

  it("only lets the board's creator or the org owner delete a board", async () => {
    const board = await newBoard();
    await run(
      ann,
      `mutation ($b: ID!) { addBoardMember(boardId: $b, email: "bob@example.com") { id } }`,
      {
        b: board.id,
      },
    );
    const DELETE = `mutation ($id: ID!) { deleteBoard(id: $id) }`;
    expect(await errorCode(run(bob, DELETE, { id: board.id }))).toBe("FORBIDDEN");
    await run(ann, DELETE, { id: board.id });
    const p = await projectOf(ann);
    expect((await run(ann, PROJECT_BOARDS, { p })).project.boards).toHaveLength(0);
  });
});

describe("archived cards", () => {
  const ARCHIVE = `mutation ($id: ID!) { archiveCard(id: $id) { id } }`;
  const ARCHIVED = `query ($id: ID!) {
    board(id: $id) { archivedCards { id title list { title archived } } }
  }`;
  const RESTORE = `mutation ($id: ID!, $listId: ID) {
    restoreCard(id: $id, listId: $listId) {
      card { title listId }
      list { title cards { title } }
      board { archivedCards { id } }
    }
  }`;

  it("lists archived cards, newest first, with their original list", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A", "B", "C"]);
    const [a, b] = [await cardId(board.id, "A"), await cardId(board.id, "B")];
    await run(ann, ARCHIVE, { id: a });
    await new Promise((r) => setTimeout(r, 5)); // distinct updatedAt
    await run(ann, ARCHIVE, { id: b });

    const { board: data } = await run(ann, ARCHIVED, { id: board.id });
    expect(data.archivedCards.map((c: { title: string }) => c.title)).toEqual(["B", "A"]);
    expect(data.archivedCards[0].list).toEqual({ title: "To do", archived: false });
  });

  it("restores a card to the bottom of its original list", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A", "B", "C"]);
    const a = await cardId(board.id, "A");
    await run(ann, ARCHIVE, { id: a });
    expect((await cardTitles(board.id))["To do"]).toEqual(["B", "C"]);

    const { restoreCard } = await run(ann, RESTORE, { id: a });
    expect(restoreCard.list.title).toBe("To do");
    expect(restoreCard.list.cards.map((c: { title: string }) => c.title)).toEqual(["B", "C", "A"]);
    expect(restoreCard.board.archivedCards).toEqual([]);
    expect((await cardTitles(board.id))["To do"]).toEqual(["B", "C", "A"]);
  });

  it("restores into another list when asked", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);
    await addCards(ann, board.lists[2].id, ["Z"]);
    const a = await cardId(board.id, "A");
    await run(ann, ARCHIVE, { id: a });
    await run(ann, RESTORE, { id: a, listId: board.lists[2].id });
    expect(await cardTitles(board.id)).toEqual({ "To do": [], Doing: [], Done: ["Z", "A"] });
  });

  it("needs a target list when the original list is archived", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);
    const a = await cardId(board.id, "A");
    await run(ann, ARCHIVE, { id: a });
    await run(ann, `mutation ($id: ID!) { archiveList(id: $id) { id } }`, {
      id: board.lists[0].id,
    });

    const { board: data } = await run(ann, ARCHIVED, { id: board.id });
    expect(data.archivedCards[0].list).toEqual({ title: "To do", archived: true });
    expect(await errorCode(run(ann, RESTORE, { id: a }))).toBe("BAD_USER_INPUT");
    // An archived list isn't a valid target either.
    expect(await errorCode(run(ann, RESTORE, { id: a, listId: board.lists[0].id }))).toBe(
      "NOT_FOUND",
    );

    await run(ann, RESTORE, { id: a, listId: board.lists[1].id });
    expect((await cardTitles(board.id)).Doing).toEqual(["A"]);
  });

  it("only restores archived cards, for board members, within the same board", async () => {
    const board = await newBoard();
    const other = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);
    const a = await cardId(board.id, "A");

    // Not archived yet.
    expect(await errorCode(run(ann, RESTORE, { id: a }))).toBe("NOT_FOUND");
    await run(ann, ARCHIVE, { id: a });
    expect(await errorCode(run(bob, RESTORE, { id: a }))).toBe("NOT_FOUND");
    expect((await run(bob, ARCHIVED, { id: board.id })).board).toBeNull();
    expect(await errorCode(run(ann, RESTORE, { id: a, listId: other.lists[0].id }))).toBe(
      "BAD_USER_INPUT",
    );
  });
});

describe("archived lists", () => {
  const ARCHIVE_LIST = `mutation ($id: ID!) { archiveList(id: $id) { id } }`;
  const ARCHIVED_LISTS = `query ($id: ID!) {
    board(id: $id) { archivedLists { title archived cards { title } } }
  }`;
  const RESTORE_LIST = `mutation ($id: ID!) {
    restoreList(id: $id) {
      list { title archived }
      board { lists { title } archivedLists { id } }
    }
  }`;

  it("lists archived lists, newest first, with the cards they hold", async () => {
    const board = await newBoard();
    const [todo, , done] = board.lists;
    await addCards(ann, todo.id, ["A", "B"]);
    await run(ann, ARCHIVE_LIST, { id: done.id });
    await new Promise((r) => setTimeout(r, 5)); // distinct updatedAt
    await run(ann, ARCHIVE_LIST, { id: todo.id });

    const { board: data } = await run(ann, ARCHIVED_LISTS, { id: board.id });
    expect(data.archivedLists).toEqual([
      { title: "To do", archived: true, cards: [{ title: "A" }, { title: "B" }] },
      { title: "Done", archived: true, cards: [] },
    ]);
  });

  it("restores a list, with its cards, at the end of the board", async () => {
    const board = await newBoard();
    const [todo] = board.lists;
    await addCards(ann, todo.id, ["A", "B"]);
    await run(ann, ARCHIVE_LIST, { id: todo.id });
    expect(await cardTitles(board.id)).toEqual({ Doing: [], Done: [] });

    const { restoreList } = await run(ann, RESTORE_LIST, { id: todo.id });
    expect(restoreList.list).toEqual({ title: "To do", archived: false });
    expect(restoreList.board.lists.map((l: { title: string }) => l.title)).toEqual([
      "Doing",
      "Done",
      "To do",
    ]);
    expect(restoreList.board.archivedLists).toEqual([]);
    expect((await cardTitles(board.id))["To do"]).toEqual(["A", "B"]);
  });

  it("leaves separately archived cards archived, but restorable to the list again", async () => {
    const board = await newBoard();
    const [todo] = board.lists;
    await addCards(ann, todo.id, ["A", "B"]);
    const a = await cardId(board.id, "A");
    await run(ann, `mutation ($id: ID!) { archiveCard(id: $id) { id } }`, { id: a });
    await run(ann, ARCHIVE_LIST, { id: todo.id });
    await run(ann, RESTORE_LIST, { id: todo.id });

    expect((await cardTitles(board.id))["To do"]).toEqual(["B"]);
    // With its list back, the card no longer needs a target list.
    await run(ann, `mutation ($id: ID!) { restoreCard(id: $id) { card { id } } }`, { id: a });
    expect((await cardTitles(board.id))["To do"]).toEqual(["B", "A"]);
  });

  it("only restores archived lists, for board members", async () => {
    const board = await newBoard();
    const [todo] = board.lists;
    expect(await errorCode(run(ann, RESTORE_LIST, { id: todo.id }))).toBe("NOT_FOUND");
    await run(ann, ARCHIVE_LIST, { id: todo.id });
    expect(await errorCode(run(bob, RESTORE_LIST, { id: todo.id }))).toBe("NOT_FOUND");
    expect((await run(bob, ARCHIVED_LISTS, { id: board.id })).board).toBeNull();
  });
});

describe("permanent delete", () => {
  const DELETE_CARD = `mutation ($id: ID!) {
    deleteCard(id: $id) { deletedId list { title cards { title } } board { archivedCards { id } } }
  }`;
  const DELETE_LIST = `mutation ($id: ID!) {
    deleteList(id: $id) { deletedId board { lists { title } archivedLists { id } archivedCards { id } } }
  }`;
  const ARCHIVE_CARD = `mutation ($id: ID!) { archiveCard(id: $id) { id } }`;

  it("deletes an active card", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A", "B"]);
    const a = await cardId(board.id, "A");
    const { deleteCard } = await run(ann, DELETE_CARD, { id: a });
    expect(deleteCard.deletedId).toBe(a);
    expect(deleteCard.list.cards.map((c: { title: string }) => c.title)).toEqual(["B"]);
    expect(await CardModel.countDocuments({ _id: a })).toBe(0);
  });

  it("deletes an archived card", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);
    const a = await cardId(board.id, "A");
    await run(ann, ARCHIVE_CARD, { id: a });
    const { deleteCard } = await run(ann, DELETE_CARD, { id: a });
    expect(deleteCard.board.archivedCards).toEqual([]);
    // Gone for good: it can't be restored.
    expect(
      await errorCode(
        run(ann, `mutation ($id: ID!) { restoreCard(id: $id) { card { id } } }`, { id: a }),
      ),
    ).toBe("NOT_FOUND");
  });

  it("deletes a list with all its cards, including archived ones", async () => {
    const board = await newBoard();
    const [todo, doing] = board.lists;
    await addCards(ann, todo.id, ["A", "B"]);
    await addCards(ann, doing.id, ["Keep"]);
    await run(ann, ARCHIVE_CARD, { id: await cardId(board.id, "A") });

    const { deleteList } = await run(ann, DELETE_LIST, { id: todo.id });
    expect(deleteList.deletedId).toBe(todo.id);
    expect(deleteList.board.lists.map((l: { title: string }) => l.title)).toEqual([
      "Doing",
      "Done",
    ]);
    expect(deleteList.board.archivedCards).toEqual([]);
    expect(await CardModel.countDocuments({ listId: todo.id })).toBe(0);
    expect((await cardTitles(board.id)).Doing).toEqual(["Keep"]);
  });

  it("deletes an archived list", async () => {
    const board = await newBoard();
    const [todo] = board.lists;
    await run(ann, `mutation ($id: ID!) { archiveList(id: $id) { id } }`, { id: todo.id });
    const { deleteList } = await run(ann, DELETE_LIST, { id: todo.id });
    expect(deleteList.board.archivedLists).toEqual([]);
  });

  it("only lets board members delete", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);
    const a = await cardId(board.id, "A");
    expect(await errorCode(run(bob, DELETE_CARD, { id: a }))).toBe("NOT_FOUND");
    expect(await errorCode(run(bob, DELETE_LIST, { id: board.lists[0].id }))).toBe("NOT_FOUND");
    expect((await cardTitles(board.id))["To do"]).toEqual(["A"]);
  });
});

describe("workspaces and projects", () => {
  const ADD_MEMBER = `mutation ($o: ID!, $e: String!) {
    addWorkspaceMember(workspaceId: $o, email: $e) { members { email } }
  }`;
  const REMOVE_MEMBER = `mutation ($o: ID!, $u: ID!) {
    removeWorkspaceMember(workspaceId: $o, userId: $u) { members { email } }
  }`;
  const ORGS = `{ workspaces { id name viewerIsOwner projects { name } } }`;
  const ASSIGN = `mutation ($id: ID!, $a: [ID!]) { updateCard(id: $id, assigneeIds: $a) { id } }`;

  it("gives every user a personal workspace, once", async () => {
    await ensureWorkspace(ann);
    await ensureWorkspace(ann);
    const { workspaces } = await run(ann, ORGS);
    expect(workspaces).toEqual([
      expect.objectContaining({
        name: "Personal",
        viewerIsOwner: true,
        projects: [{ name: "General" }],
      }),
    ]);
  });

  it("moves boards from before projects into the owner's workspace, keeping guests", async () => {
    // A board as it was stored before workspaces existed.
    const legacy = await BoardModel.create({
      title: "Old board",
      ownerId: ann,
      memberIds: [ann, bob],
    });
    await ListModel.create({ boardId: legacy._id, title: "To do", position: "a0" });

    await ensureWorkspace(ann);
    const moved = await BoardModel.findById(legacy._id).lean();
    expect(moved!.projectId?.toString()).toBe(await projectOf(ann));

    // Bob was shared on it and still is, as a guest.
    expect((await run(bob, BOARD, { id: legacy.id })).board.title).toBe("Old board");
    const shared = await run(bob, `{ sharedBoards { title } }`);
    expect(shared.sharedBoards).toEqual([{ title: "Old board" }]);
  });

  it("lets workspace members open every board in it", async () => {
    const board = await newBoard();
    const org = await orgOf(ann);
    expect((await run(bob, BOARD, { id: board.id })).board).toBeNull();

    await run(ann, ADD_MEMBER, { o: org, e: "bob@example.com" });
    expect((await run(bob, BOARD, { id: board.id })).board.title).toBe("Launch");
    expect((await run(bob, `{ sharedBoards { id } }`)).sharedBoards).toEqual([]);
    const { workspaces } = await run(bob, ORGS);
    // Bob's list includes Ann's workspace (both are called "Personal", so compare ids).
    expect(workspaces.map((o: { id: string }) => o.id)).toContain(org);

    // Already in the org, so they can't also be added as a guest.
    const SHARE = `mutation ($b: ID!) { addBoardMember(boardId: $b, email: "bob@example.com") { id } }`;
    expect(await errorCode(run(ann, SHARE, { b: board.id }))).toBe("BAD_USER_INPUT");
  });

  it("lets any member add people and projects, but only the owner manage the org", async () => {
    const org = await orgOf(ann);
    await run(ann, ADD_MEMBER, { o: org, e: "bob@example.com" });
    const cat = (await UserModel.create({ email: "cat@example.com", name: "Cat" }))._id.toString();

    // Bob (a member) can add Cat and create and rename a project.
    await run(bob, ADD_MEMBER, { o: org, e: "cat@example.com" });
    expect(await errorCode(run(bob, ADD_MEMBER, { o: org, e: "cat@example.com" }))).toBe(
      "BAD_USER_INPUT",
    );
    const created = await run(
      bob,
      `mutation ($o: ID!) {
        createProject(workspaceId: $o, name: "Marketing") { project { id } workspace { projects { name } } }
      }`,
      { o: org },
    );
    const names = created.createProject.workspace.projects.map((p: { name: string }) => p.name);
    expect(names).toEqual(["General", "Marketing"]);
    const marketing = created.createProject.project.id;
    await run(bob, `mutation ($id: ID!) { renameProject(id: $id, name: "Growth") { name } }`, {
      id: marketing,
    });

    // Only Ann can rename or delete the org, delete projects, or remove other members.
    const RENAME = `mutation ($o: ID!) { renameWorkspace(id: $o, name: "Acme") { name } }`;
    const DELETE_PROJECT = `mutation ($id: ID!) { deleteProject(id: $id) { id } }`;
    const DELETE_ORG = `mutation ($o: ID!) { deleteWorkspace(id: $o) }`;
    expect(await errorCode(run(bob, RENAME, { o: org }))).toBe("FORBIDDEN");
    expect(await errorCode(run(bob, DELETE_PROJECT, { id: marketing }))).toBe("FORBIDDEN");
    expect(await errorCode(run(bob, REMOVE_MEMBER, { o: org, u: cat }))).toBe("FORBIDDEN");
    expect(await errorCode(run(bob, DELETE_ORG, { o: org }))).toBe("FORBIDDEN");
    expect((await run(ann, RENAME, { o: org })).renameWorkspace.name).toBe("Acme");

    // Members can leave; the owner can't.
    const left = await run(cat, REMOVE_MEMBER, { o: org, u: cat });
    expect(left.removeWorkspaceMember.members.map((m: { email: string }) => m.email)).toEqual([
      "ann@example.com",
      "bob@example.com",
    ]);
    expect(await errorCode(run(ann, REMOVE_MEMBER, { o: org, u: ann }))).toBe("FORBIDDEN");
  });

  it("removes access and assignments when someone leaves, unless they're a guest", async () => {
    const org = await orgOf(ann);
    await run(ann, ADD_MEMBER, { o: org, e: "bob@example.com" });
    const plain = await newBoard();
    const guested = await newBoard();
    for (const board of [plain, guested]) {
      await addCards(ann, board.lists[0].id, ["Task"]);
      await run(ann, ASSIGN, { id: await cardId(board.id, "Task"), a: [bob] });
    }
    // Bob is also a guest on one board directly.
    await BoardModel.updateOne({ _id: guested.id }, { $addToSet: { memberIds: bob } });

    await run(ann, REMOVE_MEMBER, { o: org, u: bob });
    expect((await run(bob, BOARD, { id: plain.id })).board).toBeNull();
    const plainAfter = await run(ann, BOARD, { id: plain.id });
    expect(plainAfter.board.lists[0].cards[0].assignees).toEqual([]);
    expect((await run(bob, BOARD, { id: guested.id })).board.title).toBe("Launch");
    const guestedAfter = await run(ann, BOARD, { id: guested.id });
    expect(guestedAfter.board.lists[0].cards[0].assignees).toEqual([{ id: bob }]);
  });

  it("lets the board's creator or the org owner manage a board", async () => {
    const org = await orgOf(ann);
    await run(ann, ADD_MEMBER, { o: org, e: "bob@example.com" });
    const bobs = await newBoard(bob, await projectOf(ann));
    const anns = await newBoard(ann);
    const CAN = `query ($id: ID!) { board(id: $id) { viewerCanManage } }`;
    expect((await run(bob, CAN, { id: bobs.id })).board.viewerCanManage).toBe(true);
    expect((await run(ann, CAN, { id: bobs.id })).board.viewerCanManage).toBe(true);
    expect((await run(bob, CAN, { id: anns.id })).board.viewerCanManage).toBe(false);
  });

  it("only creates boards in projects the caller belongs to", async () => {
    const CREATE = `mutation ($p: ID!) { createBoard(projectId: $p, title: "Sneaky") { id } }`;
    expect(await errorCode(run(bob, CREATE, { p: await projectOf(ann) }))).toBe("NOT_FOUND");
  });

  it("deletes a project or an workspace with everything in it", async () => {
    const org = await orgOf(ann);
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);

    const DELETE_PROJECT = `mutation ($id: ID!) { deleteProject(id: $id) { projects { id } } }`;
    const after = await run(ann, DELETE_PROJECT, { id: await projectOf(ann) });
    expect(after.deleteProject.projects).toEqual([]);
    expect(await BoardModel.countDocuments({ _id: board.id })).toBe(0);
    expect(await ListModel.countDocuments({ boardId: board.id })).toBe(0);
    expect(await CardModel.countDocuments({ boardId: board.id })).toBe(0);

    const CREATE_PROJECT = `mutation ($o: ID!) { createProject(workspaceId: $o, name: "X") { project { id } } }`;
    const second = await run(ann, CREATE_PROJECT, { o: org });
    await newBoard(ann, second.createProject.project.id);
    await run(ann, `mutation ($o: ID!) { deleteWorkspace(id: $o) }`, { o: org });
    expect((await run(ann, ORGS)).workspaces).toEqual([]);
    expect(await BoardModel.countDocuments({})).toBe(0);
  });
});
