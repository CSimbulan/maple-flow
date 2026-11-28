import { graphql, type ExecutionResult } from "graphql";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDb } from "../src/server/db/connect";
import {
  ActivityModel,
  BoardModel,
  CardModel,
  CommentModel,
  ListModel,
  OrganizationModel,
  UserModel,
} from "../src/server/db/models";
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

describe("list colors", () => {
  const COLORS = `query ($id: ID!) { board(id: $id) { lists { title color } } }`;
  const colorsOf = async (boardId: string) =>
    (await run(ann, COLORS, { id: boardId })).board.lists.map(
      (l: { title: string; color: string }) => [l.title, l.color],
    );
  const addList = (boardId: string, title: string, color?: string) =>
    run(
      ann,
      `mutation ($b: ID!, $t: String!, $c: String) {
        createList(boardId: $b, title: $t, color: $c) { id }
      }`,
      { b: boardId, t: title, c: color },
    );

  it("gives new lists the next default color, cycling after five", async () => {
    const board = await newBoard();
    await addList(board.id, "Review");
    await addList(board.id, "Shipped");
    await addList(board.id, "Later");
    expect(await colorsOf(board.id)).toEqual([
      ["To do", "#B3E5FC"],
      ["Doing", "#C8E6C9"],
      ["Done", "#FFECB3"],
      ["Review", "#F8BBD0"],
      ["Shipped", "#D1C4E9"],
      ["Later", "#B3E5FC"],
    ]);
  });

  it("uses a picked color and lets members change it", async () => {
    const board = await newBoard();
    await addList(board.id, "Review", "#C8E6C9");
    expect((await colorsOf(board.id))[3]).toEqual(["Review", "#C8E6C9"]);

    const SET = `mutation ($id: ID!, $c: String!) { updateListColor(id: $id, color: $c) { color } }`;
    const todo = board.lists[0].id;
    expect((await run(ann, SET, { id: todo, c: "#D1C4E9" })).updateListColor.color).toBe("#D1C4E9");
    expect(await errorCode(run(ann, SET, { id: todo, c: "blue" }))).toBe("BAD_USER_INPUT");
    expect(await errorCode(addList(board.id, "Bad", "#12345"))).toBe("BAD_USER_INPUT");
    expect(await errorCode(run(bob, SET, { id: todo, c: "#B3E5FC" }))).toBe("NOT_FOUND");
  });

  it("colors lists from before colors existed by their place, and keeps it", async () => {
    const board = await newBoard();
    await ListModel.updateMany({ boardId: board.id }, { $unset: { color: 1 } });
    // Move "Done" first: it takes the first default color and keeps it from then on.
    await run(ann, `mutation ($id: ID!, $a: ID) { moveList(id: $id, afterId: $a) { id } }`, {
      id: board.lists[2].id,
      a: board.lists[0].id,
    });
    expect(await colorsOf(board.id)).toEqual([
      ["Done", "#B3E5FC"],
      ["To do", "#C8E6C9"],
      ["Doing", "#FFECB3"],
    ]);
    const stored = await ListModel.findById(board.lists[2].id).lean();
    expect(stored?.color).toBe("#B3E5FC");
  });
});

describe("tags", () => {
  const TAGS = `query ($id: ID!) { board(id: $id) { tags { id name color } } }`;
  const tagsOf = async (boardId: string, userId = ann) =>
    (await run(userId, TAGS, { id: boardId })).board.tags as {
      id: string;
      name: string;
      color: string;
    }[];
  const SET_TAGS = `mutation ($id: ID!, $t: [ID!]) {
    updateCard(id: $id, tagIds: $t) { tags { name } }
  }`;
  const CREATE = `mutation ($b: ID!, $n: String!, $c: String!) {
    createTag(boardId: $b, name: $n, color: $c) { tags { name color } }
  }`;
  const UPDATE = `mutation ($b: ID!, $t: ID!, $n: String, $c: String) {
    updateTag(boardId: $b, tagId: $t, name: $n, color: $c) { tags { name color } }
  }`;
  const DELETE = `mutation ($b: ID!, $t: ID!) { deleteTag(boardId: $b, tagId: $t) { tags { name } } }`;

  it("gives new boards the default software tags", async () => {
    const board = await newBoard();
    expect((await tagsOf(board.id)).map((t) => t.name)).toEqual([
      "New Feature",
      "Bug",
      "UX/UI",
      "Improvement",
      "Tech Debt",
      "Documentation",
      "Testing",
      "Performance",
    ]);
  });

  it("gives boards from before tags the defaults once, without touching updatedAt", async () => {
    const board = await newBoard();
    await BoardModel.updateOne({ _id: board.id }, { $unset: { tags: 1 } }, { timestamps: false });
    const before = (await BoardModel.findById(board.id).lean())!.updatedAt;
    const first = await tagsOf(board.id);
    expect(first).toHaveLength(8);
    // Same ids the second time: they were stored, not made up per request.
    expect(await tagsOf(board.id)).toEqual(first);
    expect((await BoardModel.findById(board.id).lean())!.updatedAt).toEqual(before);
  });

  it("tags cards with the board's tags, in board order", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["Task"]);
    const id = await cardId(board.id, "Task");
    const [feature, bug] = await tagsOf(board.id);

    const set = await run(ann, SET_TAGS, { id, t: [bug.id, feature.id, bug.id] });
    expect(set.updateCard.tags).toEqual([{ name: "New Feature" }, { name: "Bug" }]);
    expect((await run(ann, SET_TAGS, { id, t: [] })).updateCard.tags).toEqual([]);

    // A tag from another board, or not a tag at all, is rejected.
    const other = await tagsOf((await newBoard()).id);
    expect(await errorCode(run(ann, SET_TAGS, { id, t: [other[0].id] }))).toBe("BAD_USER_INPUT");
    expect(await errorCode(run(ann, SET_TAGS, { id, t: ["nope"] }))).toBe("BAD_USER_INPUT");
  });

  it("creates, renames and recolors tags, with unique names", async () => {
    const board = await newBoard();
    const created = await run(ann, CREATE, { b: board.id, n: " Security ", c: "#283593" });
    expect(created.createTag.tags.at(-1)).toEqual({ name: "Security", color: "#283593" });

    expect(await errorCode(run(ann, CREATE, { b: board.id, n: "bug", c: "#283593" }))).toBe(
      "BAD_USER_INPUT",
    );
    expect(await errorCode(run(ann, CREATE, { b: board.id, n: "  ", c: "#283593" }))).toBe(
      "BAD_USER_INPUT",
    );
    expect(await errorCode(run(ann, CREATE, { b: board.id, n: "X", c: "red" }))).toBe(
      "BAD_USER_INPUT",
    );

    const bug = (await tagsOf(board.id))[1];
    const renamed = await run(ann, UPDATE, { b: board.id, t: bug.id, n: "Defect", c: "#4e342e" });
    expect(renamed.updateTag.tags[1]).toEqual({ name: "Defect", color: "#4e342e" });
    // Renaming to its own name in other case is fine; to another tag's name is not.
    await run(ann, UPDATE, { b: board.id, t: bug.id, n: "DEFECT" });
    expect(await errorCode(run(ann, UPDATE, { b: board.id, t: bug.id, n: "testing" }))).toBe(
      "BAD_USER_INPUT",
    );
  });

  it("deletes a tag from the board and from its cards", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["Task"]);
    const id = await cardId(board.id, "Task");
    const [feature, bug] = await tagsOf(board.id);
    await run(ann, SET_TAGS, { id, t: [feature.id, bug.id] });

    const after = await run(ann, DELETE, { b: board.id, t: bug.id });
    expect(after.deleteTag.tags.map((t: { name: string }) => t.name)).not.toContain("Bug");
    const card = await CardModel.findById(id).lean();
    expect(card!.tagIds.map(String)).toEqual([feature.id]);
    expect(await errorCode(run(ann, DELETE, { b: board.id, t: bug.id }))).toBe("NOT_FOUND");
  });

  it("only lets people who can open the board see or change its tags", async () => {
    const board = await newBoard();
    const [tag] = await tagsOf(board.id);
    expect((await run(bob, TAGS, { id: board.id })).board).toBeNull();
    const ops = [
      () => run(bob, CREATE, { b: board.id, n: "Mine", c: "#283593" }),
      () => run(bob, UPDATE, { b: board.id, t: tag.id, n: "Mine" }),
      () => run(bob, DELETE, { b: board.id, t: tag.id }),
    ];
    for (const op of ops) expect(await errorCode(op())).toBe("NOT_FOUND");
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

  it("creates a card with its details in one go, checked like updates", async () => {
    const board = await newBoard();
    const tags = (
      await run(ann, `query ($id: ID!) { board(id: $id) { tags { id } } }`, {
        id: board.id,
      })
    ).board.tags;
    const CREATE = `mutation ($l: ID!, $t: String!, $d: String, $tags: [ID!], $due: String, $a: [ID!]) {
      createCard(listId: $l, title: $t, description: $d, tagIds: $tags, dueDate: $due, assigneeIds: $a) {
        cards { title description tags { id } dueDate assignees { id } }
      }
    }`;
    const vars = {
      l: board.lists[0].id,
      t: "Full",
      d: "Notes",
      tags: [tags[1].id],
      due: "2026-12-24",
      a: [ann],
    };
    const { createCard } = await run(ann, CREATE, vars);
    expect(createCard.cards).toEqual([
      {
        title: "Full",
        description: "Notes",
        tags: [{ id: tags[1].id }],
        dueDate: "2026-12-24T00:00:00.000Z",
        assignees: [{ id: ann }],
      },
    ]);

    // Same rules as updateCard, and nothing is created when they fail.
    expect(await errorCode(run(ann, CREATE, { ...vars, a: [bob] }))).toBe("BAD_USER_INPUT");
    expect(await errorCode(run(ann, CREATE, { ...vars, tags: ["nope"] }))).toBe("BAD_USER_INPUT");
    expect(await errorCode(run(ann, CREATE, { ...vars, due: "soon" }))).toBe("BAD_USER_INPUT");
    expect(await CardModel.countDocuments({ boardId: board.id })).toBe(1);
  });

  it("sets, keeps and clears a card's priority", async () => {
    const board = await newBoard();
    const created = await run(
      ann,
      `mutation ($l: ID!) { createCard(listId: $l, title: "Urgent", priority: HIGHEST) { cards { id priority } } }`,
      { l: board.lists[0].id },
    );
    const { id, priority } = created.createCard.cards[0];
    expect(priority).toBe("HIGHEST");

    const SET = `mutation ($id: ID!, $p: Priority, $t: String) {
      updateCard(id: $id, priority: $p, title: $t) { priority }
    }`;
    expect((await run(ann, SET, { id, p: "LOW" })).updateCard.priority).toBe("LOW");
    // Leaving priority out keeps it; passing null clears it.
    expect((await run(ann, SET, { id, t: "Renamed" })).updateCard.priority).toBe("LOW");
    expect((await run(ann, SET, { id, p: null })).updateCard.priority).toBeNull();
    // Not one of the five values: rejected by the GraphQL enum itself.
    await expect(run(ann, SET, { id, p: "URGENT" })).rejects.toThrow();

    // Cards from before priorities have none.
    await CardModel.updateOne({ _id: id }, { $unset: { priority: 1 } });
    expect((await run(ann, SET, { id, t: "Old" })).updateCard.priority).toBeNull();
  });

  it("updates card details", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["Task"]);
    const id = await cardId(board.id, "Task");
    const UPDATE = `mutation ($id: ID!, $due: String, $a: [ID!]) {
      updateCard(id: $id, dueDate: $due, assigneeIds: $a) { dueDate assignees { id } }
    }`;

    const set = await run(ann, UPDATE, { id, due: "2026-12-24" });
    expect(set.updateCard.dueDate).toBe("2026-12-24T00:00:00.000Z");

    // Leaving dueDate out keeps it; passing null clears it.
    const kept = await run(ann, UPDATE, { id, a: [] });
    expect(kept.updateCard.dueDate).toBe("2026-12-24T00:00:00.000Z");
    const cleared = await run(ann, UPDATE, { id, due: null });
    expect(cleared.updateCard.dueDate).toBeNull();

    expect(await errorCode(run(ann, UPDATE, { id, a: [bob] }))).toBe("BAD_USER_INPUT");
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

describe("comments and activity", () => {
  const FEED = `query ($id: ID!) {
    card(id: $id) {
      comments { id text editedAt viewerIsAuthor author { name } }
      activity {
        createdAt kind from to added removed actor { name } addedUsers { name } removedUsers { name }
      }
    }
  }`;
  const feed = async (id: string, userId = ann) => (await run(userId, FEED, { id })).card;
  const ADD = `mutation ($c: ID!, $t: String!) { addComment(cardId: $c, text: $t) { comments { id text } } }`;
  const EDIT = `mutation ($id: ID!, $t: String!) { updateComment(id: $id, text: $t) { text editedAt } }`;
  const DELETE = `mutation ($id: ID!) { deleteComment(id: $id) { comments { id } } }`;
  const MOVE = `mutation ($id: ID!, $to: ID!, $after: ID) {
    moveCard(id: $id, toListId: $to, afterId: $after) { card { id } }
  }`;

  async function setup() {
    const board = await newBoard();
    await run(
      ann,
      `mutation ($o: ID!) { addWorkspaceMember(workspaceId: $o, email: "bob@example.com") { id } }`,
      {
        o: await orgOf(ann),
      },
    );
    await addCards(ann, board.lists[0].id, ["A", "B"]);
    return { board, a: await cardId(board.id, "A"), b: await cardId(board.id, "B") };
  }

  it("adds comments, which only their author can edit or delete", async () => {
    const { a } = await setup();
    await run(ann, ADD, { c: a, t: "  First  " });
    const added = await run(bob, ADD, { c: a, t: "Second" });
    expect(added.addComment.comments.map((c: { text: string }) => c.text)).toEqual([
      "First",
      "Second",
    ]);
    const [first] = (await feed(a, bob)).comments;
    expect(first).toMatchObject({ author: { name: "Ann" }, viewerIsAuthor: false, editedAt: null });

    expect(await errorCode(run(bob, EDIT, { id: first.id, t: "Hacked" }))).toBe("FORBIDDEN");
    expect(await errorCode(run(bob, DELETE, { id: first.id }))).toBe("FORBIDDEN");
    expect(await errorCode(run(ann, ADD, { c: a, t: "   " }))).toBe("BAD_USER_INPUT");

    const edited = await run(ann, EDIT, { id: first.id, t: "First, edited" });
    expect(edited.updateComment.text).toBe("First, edited");
    expect(edited.updateComment.editedAt).not.toBeNull();

    const after = await run(ann, DELETE, { id: first.id });
    expect(after.deleteComment.comments).toHaveLength(1);
  });

  it("hides comments from people who can't open the board", async () => {
    const board = await newBoard();
    await addCards(ann, board.lists[0].id, ["A"]);
    const a = await cardId(board.id, "A");
    const { addComment } = await run(ann, ADD, { c: a, t: "Secret" });
    expect((await run(bob, FEED, { id: a })).card).toBeNull();
    expect(await errorCode(run(bob, ADD, { c: a, t: "Hi" }))).toBe("NOT_FOUND");
    expect(await errorCode(run(bob, DELETE, { id: addComment.comments[0].id }))).toBe("NOT_FOUND");
  });

  it("logs card changes, moves between lists, archiving and restoring", async () => {
    const { board, a, b } = await setup();
    const [todo, doing] = board.lists;
    const tags = (
      await run(ann, `query ($id: ID!) { board(id: $id) { tags { id name color } } }`, {
        id: board.id,
      })
    ).board.tags as { id: string; name: string; color: string }[];

    await run(
      ann,
      `mutation ($id: ID!, $t: [ID!], $a: [ID!]) {
        updateCard(id: $id, title: "A2", description: "Notes", tagIds: $t, dueDate: "2026-12-03",
          priority: HIGH, assigneeIds: $a) { id }
      }`,
      { id: a, t: [tags[0].id, tags[1].id], a: [bob] },
    );
    // Saving the same values again logs nothing.
    await run(
      ann,
      `mutation ($id: ID!, $t: [ID!]) {
        updateCard(id: $id, title: "A2", description: "Notes", tagIds: $t, priority: HIGH) { id }
      }`,
      { id: a, t: [tags[1].id, tags[0].id] },
    );
    await run(
      bob,
      `mutation ($id: ID!, $t: [ID!]) {
        updateCard(id: $id, tagIds: $t, dueDate: null, priority: null, assigneeIds: []) { id }
      }`,
      { id: a, t: [tags[1].id, tags[2].id] },
    );
    // Reordering within a list isn't logged; moving to another list is.
    await run(ann, MOVE, { id: a, to: todo.id, after: b });
    await run(bob, MOVE, { id: a, to: doing.id });
    await run(ann, `mutation ($id: ID!) { archiveCard(id: $id) { id } }`, { id: a });
    await run(
      ann,
      `mutation ($id: ID!, $l: ID) { restoreCard(id: $id, listId: $l) { card { id } } }`,
      {
        id: a,
        l: todo.id,
      },
    );

    const activity = (await feed(a)).activity;
    // One save's changes share a time, so the feed can show them as one entry.
    const firstSave = activity.slice(1, 7).map((e: { createdAt: string }) => e.createdAt);
    expect(new Set(firstSave).size).toBe(1);
    expect(activity).toEqual([
      expect.objectContaining({ kind: "CREATED", to: "To do", actor: { name: "Ann" } }),
      expect.objectContaining({ kind: "RENAMED", from: "A", to: "A2" }),
      expect.objectContaining({ kind: "DESCRIPTION" }),
      expect.objectContaining({ kind: "TAGS", added: [tags[0].name, tags[1].name], removed: [] }),
      expect.objectContaining({ kind: "DUE_DATE", from: null, to: "2026-12-03" }),
      expect.objectContaining({ kind: "PRIORITY", from: null, to: "HIGH" }),
      expect.objectContaining({
        kind: "ASSIGNEES",
        addedUsers: [{ name: "Bob" }],
        removedUsers: [],
      }),
      expect.objectContaining({
        kind: "TAGS",
        added: [tags[2].name],
        removed: [tags[0].name],
        actor: { name: "Bob" },
      }),
      expect.objectContaining({ kind: "DUE_DATE", from: "2026-12-03", to: null }),
      expect.objectContaining({ kind: "PRIORITY", from: "HIGH", to: null }),
      expect.objectContaining({
        kind: "ASSIGNEES",
        addedUsers: [],
        removedUsers: [{ name: "Bob" }],
      }),
      expect.objectContaining({
        kind: "MOVED",
        from: "To do",
        to: "Doing",
        actor: { name: "Bob" },
      }),
      expect.objectContaining({ kind: "ARCHIVED" }),
      expect.objectContaining({ kind: "RESTORED", to: "To do" }),
    ]);
    // Tag names stay readable after the tag is renamed or deleted.
    await run(ann, `mutation ($b: ID!, $t: ID!) { deleteTag(boardId: $b, tagId: $t) { id } }`, {
      b: board.id,
      t: tags[0].id,
    });
    expect((await feed(a)).activity[3].added).toEqual([tags[0].name, tags[1].name]);
    // The deleted tag keeps the chip color it had.
    const TAG_FEED = `query ($id: ID!) { card(id: $id) { activity { addedTags { name color } } } }`;
    const colors = (await run(ann, TAG_FEED, { id: a })).card.activity[3].addedTags;
    expect(colors).toEqual([
      { name: tags[0].name, color: tags[0].color },
      { name: tags[1].name, color: tags[1].color },
    ]);
  });

  it("logs a new card's starting details with its creation, at the same time", async () => {
    const board = await newBoard();
    const tags = (
      await run(ann, `query ($id: ID!) { board(id: $id) { tags { id name } } }`, { id: board.id })
    ).board.tags as { id: string; name: string }[];
    await run(
      ann,
      `mutation ($l: ID!, $t: [ID!], $a: [ID!]) {
        createCard(listId: $l, title: "New", description: "Notes", tagIds: $t, priority: LOW,
          dueDate: "2026-12-03", assigneeIds: $a) { id }
      }`,
      { l: board.lists[0].id, t: [tags[1].id], a: [ann] },
    );
    const activity = (await feed(await cardId(board.id, "New"))).activity;
    expect(activity.map((e: { kind: string }) => e.kind)).toEqual([
      "CREATED",
      "DESCRIPTION",
      "TAGS",
      "DUE_DATE",
      "PRIORITY",
      "ASSIGNEES",
    ]);
    expect(activity[2].added).toEqual([tags[1].name]);
    expect(new Set(activity.map((e: { createdAt: string }) => e.createdAt)).size).toBe(1);

    // A card created with just a title logs only that it was created.
    await addCards(ann, board.lists[0].id, ["Plain"]);
    const plain = (await feed(await cardId(board.id, "Plain"))).activity;
    expect(plain.map((e: { kind: string }) => e.kind)).toEqual(["CREATED"]);
  });

  it("colors tags in entries from before colors were recorded by the board's tags", async () => {
    const { board, a } = await setup();
    const card = (await CardModel.findById(a).lean())!;
    await ActivityModel.create({
      cardId: card._id,
      boardId: card.boardId,
      actorId: ann,
      kind: "TAGS",
      added: ["bug", "Gone"],
    });
    const TAG_FEED = `query ($id: ID!) { card(id: $id) { activity { addedTags { name color } } } }`;
    const bug = (await BoardModel.findById(board.id).lean())!.tags!.find((t) => t.name === "Bug")!;
    expect((await run(ann, TAG_FEED, { id: a })).card.activity.at(-1).addedTags).toEqual([
      { name: "bug", color: bug.color },
      { name: "Gone", color: "#9e9e9e" },
    ]);
  });

  it("deletes comments and activity with their card, list or board", async () => {
    const { board, a, b } = await setup();
    await run(ann, ADD, { c: a, t: "On A" });
    await run(ann, ADD, { c: b, t: "On B" });
    await run(ann, `mutation ($id: ID!) { deleteCard(id: $id) { deletedId } }`, { id: a });
    expect(await CommentModel.countDocuments({ cardId: a })).toBe(0);
    expect(await ActivityModel.countDocuments({ cardId: a })).toBe(0);
    expect(await CommentModel.countDocuments({ cardId: b })).toBe(1);

    await run(ann, `mutation ($id: ID!) { deleteList(id: $id) { deletedId } }`, {
      id: board.lists[0].id,
    });
    expect(await CommentModel.countDocuments({})).toBe(0);
    expect(await ActivityModel.countDocuments({})).toBe(0);

    await addCards(ann, board.lists[1].id, ["C"]);
    await run(ann, `mutation ($id: ID!) { deleteBoard(id: $id) }`, { id: board.id });
    expect(await ActivityModel.countDocuments({})).toBe(0);
  });
});

describe("sorting a list", () => {
  const SORT = `mutation ($id: ID!, $by: CardSort!) {
    sortList(id: $id, by: $by) { cards { title } }
  }`;
  const sortedTitles = async (listId: string, by: string, userId = ann) =>
    (await run(userId, SORT, { id: listId, by })).sortList.cards.map(
      (c: { title: string }) => c.title,
    );

  it("reorders the cards once by priority, then creation date", async () => {
    const board = await newBoard();
    const todo = board.lists[0].id;
    await addCards(ann, todo, ["None", "Low", "High 1", "High 2"]);
    const set = (title: string, priority: string) =>
      cardId(board.id, title).then((id) =>
        run(ann, `mutation ($id: ID!, $p: Priority) { updateCard(id: $id, priority: $p) { id } }`, {
          id,
          p: priority,
        }),
      );
    await set("Low", "LOW");
    await set("High 1", "HIGH");
    await set("High 2", "HIGH");

    expect(await sortedTitles(todo, "PRIORITY")).toEqual(["High 1", "High 2", "Low", "None"]);
    // Saved for everyone, and new cards still go to the bottom.
    await addCards(ann, todo, ["Newest"]);
    expect((await cardTitles(board.id))["To do"]).toEqual([
      "High 1",
      "High 2",
      "Low",
      "None",
      "Newest",
    ]);
    expect(await sortedTitles(todo, "CREATED_NEWEST")).toEqual([
      "Newest",
      "High 2",
      "High 1",
      "Low",
      "None",
    ]);
  });

  it("sorts by latest activity or comment, and by comment count", async () => {
    const board = await newBoard();
    const todo = board.lists[0].id;
    await addCards(ann, todo, ["A", "B", "C"]);
    const comment = async (title: string) =>
      run(ann, `mutation ($c: ID!) { addComment(cardId: $c, text: "Hi") { id } }`, {
        c: await cardId(board.id, title),
      });
    await comment("A");
    await comment("A");
    await comment("B");
    expect(await sortedTitles(todo, "UPDATED_NEWEST")).toEqual(["B", "A", "C"]);
    expect(await sortedTitles(todo, "UPDATED_OLDEST")).toEqual(["C", "A", "B"]);
    expect(await sortedTitles(todo, "MOST_COMMENTS")).toEqual(["A", "B", "C"]);
  });

  it("sorts by when cards arrived in the list, by moves as well as creation", async () => {
    const board = await newBoard();
    const [todo, doing] = board.lists;
    await addCards(ann, todo.id, ["Old here"]);
    await addCards(ann, doing.id, ["Moved in"]);
    await addCards(ann, todo.id, ["New here"]);
    // Created first of all, but arrives in To do last.
    await run(
      ann,
      `mutation ($id: ID!, $to: ID!) { moveCard(id: $id, toListId: $to) { card { id } } }`,
      {
        id: await cardId(board.id, "Moved in"),
        to: todo.id,
      },
    );
    expect(await sortedTitles(todo.id, "ADDED_NEWEST")).toEqual([
      "Moved in",
      "New here",
      "Old here",
    ]);
    expect(await sortedTitles(todo.id, "ADDED_OLDEST")).toEqual([
      "Old here",
      "New here",
      "Moved in",
    ]);
  });

  it("counts only the latest arrival for a card that left the list and came back", async () => {
    const board = await newBoard();
    const [todo, doing] = board.lists;
    await addCards(ann, todo.id, ["Round trip", "Second"]);
    const MOVE = `mutation ($id: ID!, $to: ID!) { moveCard(id: $id, toListId: $to) { card { id } } }`;
    const id = await cardId(board.id, "Round trip");
    await run(ann, MOVE, { id, to: doing.id });
    await run(ann, MOVE, { id, to: todo.id });
    expect(await sortedTitles(todo.id, "ADDED_NEWEST")).toEqual(["Round trip", "Second"]);
  });

  it("only lets board members sort, and ignores archived cards", async () => {
    const board = await newBoard();
    const todo = board.lists[0].id;
    await addCards(ann, todo, ["b", "a", "c"]);
    await run(ann, `mutation ($id: ID!) { archiveCard(id: $id) { id } }`, {
      id: await cardId(board.id, "c"),
    });
    expect(await sortedTitles(todo, "TITLE")).toEqual(["a", "b"]);
    expect(await errorCode(run(bob, SORT, { id: todo, by: "TITLE" }))).toBe("NOT_FOUND");
  });
});

describe("workspace join dates", () => {
  const MEMBERS = `query ($id: ID!) {
    workspace(id: $id) { memberships { joinedAt user { name } } }
  }`;
  const ADD = `mutation ($o: ID!, $e: String!) {
    addWorkspaceMember(workspaceId: $o, email: $e) { id }
  }`;
  const memberships = async (orgId: string, userId = ann) =>
    (await run(userId, MEMBERS, { id: orgId })).workspace.memberships as {
      joinedAt: string;
      user: { name: string };
    }[];

  it("records when people join, and forgets it when they leave", async () => {
    const org = await orgOf(ann);
    const before = Date.now();
    await run(ann, ADD, { o: org, e: "bob@example.com" });
    const [owner, member] = await memberships(org);
    expect(owner.user.name).toBe("Ann");
    expect(member.user.name).toBe("Bob");
    expect(Date.parse(member.joinedAt)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(owner.joinedAt)).toBeLessThanOrEqual(Date.parse(member.joinedAt));

    await run(
      ann,
      `mutation ($o: ID!, $u: ID!) { removeWorkspaceMember(workspaceId: $o, userId: $u) { id } }`,
      {
        o: org,
        u: bob,
      },
    );
    const doc = (await OrganizationModel.findById(org).lean())!;
    expect(doc.memberSince!.map((m) => m.userId.toString())).toEqual([ann]);
  });

  it("backfills workspaces from before join dates: the owner's creation date, others now", async () => {
    const org = await orgOf(ann);
    await run(ann, ADD, { o: org, e: "bob@example.com" });
    const created = new Date("2025-03-01T12:00:00Z");
    await OrganizationModel.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(org) },
      { $unset: { memberSince: "" }, $set: { createdAt: created } },
    );
    const before = Date.now();
    const [owner, member] = await memberships(org);
    expect(owner.joinedAt).toBe(created.toISOString());
    expect(Date.parse(member.joinedAt)).toBeGreaterThanOrEqual(before - 1000);
    // Saved, so it doesn't change on the next read.
    expect(await memberships(org)).toEqual([owner, member]);
    const doc = (await OrganizationModel.findById(org).lean())!;
    expect(doc.memberSince).toHaveLength(2);
  });
});

describe("moving all cards", () => {
  const MOVE_ALL = `mutation ($from: ID!, $to: ID!) {
    moveAllCards(fromListId: $from, toListId: $to) {
      moved fromList { cards { title } } toList { cards { title } }
    }
  }`;

  it("moves a list's active cards to the bottom of another, in order, logging each move", async () => {
    const board = await newBoard();
    const [todo, doing] = board.lists;
    await addCards(ann, todo.id, ["A", "B", "C"]);
    await addCards(ann, doing.id, ["D"]);
    await run(ann, `mutation ($id: ID!) { archiveCard(id: $id) { id } }`, {
      id: await cardId(board.id, "C"),
    });

    const { moveAllCards } = await run(ann, MOVE_ALL, { from: todo.id, to: doing.id });
    expect(moveAllCards.moved).toBe(2);
    expect(moveAllCards.fromList.cards).toEqual([]);
    expect(moveAllCards.toList.cards.map((c: { title: string }) => c.title)).toEqual([
      "D",
      "A",
      "B",
    ]);
    // The archived card stays with its list.
    expect((await CardModel.findOne({ title: "C" }).lean())!.listId.toString()).toBe(todo.id);

    const FEED = `query ($id: ID!) { card(id: $id) { activity { kind from to } } }`;
    const activity = (await run(ann, FEED, { id: await cardId(board.id, "A") })).card.activity;
    expect(activity.at(-1)).toEqual({ kind: "MOVED", from: "To do", to: "Doing" });
  });

  it("rejects the same list, lists on other boards, and people who can't open the board", async () => {
    const board = await newBoard();
    const other = await newBoard();
    const [todo] = board.lists;
    expect(await errorCode(run(ann, MOVE_ALL, { from: todo.id, to: todo.id }))).toBe(
      "BAD_USER_INPUT",
    );
    expect(await errorCode(run(ann, MOVE_ALL, { from: todo.id, to: other.lists[0].id }))).toBe(
      "BAD_USER_INPUT",
    );
    expect(await errorCode(run(bob, MOVE_ALL, { from: todo.id, to: board.lists[1].id }))).toBe(
      "NOT_FOUND",
    );
  });
});
