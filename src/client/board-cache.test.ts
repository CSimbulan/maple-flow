import { gql, InMemoryCache } from "@apollo/client";
import { describe, expect, it } from "vitest";
import { forgetBoardAudiences } from "./board-cache";

const BOARD = gql`
  query {
    board(id: "b1") {
      id
      title
      members {
        id
      }
      guests {
        id
      }
      lists {
        id
        cards {
          id
          assignees {
            id
          }
        }
      }
    }
  }
`;

function cacheWithBoard() {
  const cache = new InMemoryCache();
  const user = { __typename: "User", id: "u1" };
  cache.writeQuery({
    query: BOARD,
    data: {
      board: {
        __typename: "Board",
        id: "b1",
        title: "Launch",
        members: [user],
        guests: [],
        lists: [
          {
            __typename: "List",
            id: "l1",
            cards: [{ __typename: "Card", id: "c1", assignees: [user] }],
          },
        ],
      },
    },
  });
  return cache;
}

const fields = (cache: InMemoryCache, id: string) =>
  Object.keys((cache.extract() as Record<string, object>)[id] ?? {});

describe("forgetBoardAudiences", () => {
  it("drops boards' members and guests, so they're fetched again", () => {
    const cache = cacheWithBoard();
    forgetBoardAudiences(cache);
    expect(fields(cache, "Board:b1")).not.toContain("members");
    expect(fields(cache, "Board:b1")).not.toContain("guests");
    // The rest of the board stays, and cards keep their assignees unless asked.
    expect(fields(cache, "Board:b1")).toContain("title");
    expect(fields(cache, "Card:c1")).toContain("assignees");
    // The board query is now incomplete, which makes Apollo go to the server for it.
    expect(cache.readQuery({ query: BOARD })).toBeNull();
  });

  it("also drops card assignees when someone was removed", () => {
    const cache = cacheWithBoard();
    forgetBoardAudiences(cache, { assignees: true });
    expect(fields(cache, "Card:c1")).not.toContain("assignees");
  });
});
