import { graphql, type ExecutionResult } from "graphql";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "../src/server/db/connect";
import { CardModel, UserModel } from "../src/server/db/models";
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

async function newBoard(userId = ann) {
  const data = await run(
    userId,
    `mutation { createBoard(title: "Launch") { id lists { id title } } }`,
  );
  return data.createBoard as { id: string; lists: { id: string; title: string }[] };
}

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

    expect((await run(ann, `{ boards { id } }`)).boards).toHaveLength(1);
    expect((await run(bob, `{ boards { id } }`)).boards).toHaveLength(0);
    expect((await run(bob, BOARD, { id: board.id })).board).toBeNull();
  });

  it("requires sign-in", async () => {
    expect(await errorCode(run(null, `{ boards { id } }`))).toBe("UNAUTHENTICATED");
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
    const code = await errorCode(run(ann, `mutation { createBoard(title: "   ") { id } }`));
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

  it("only lets the owner delete a board", async () => {
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
    expect((await run(ann, `{ boards { id } }`)).boards).toHaveLength(0);
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
