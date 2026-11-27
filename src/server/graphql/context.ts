import DataLoader from "dataloader";
import { Types } from "mongoose";
import {
  BoardModel,
  CardModel,
  ListModel,
  UserModel,
  type BoardDoc,
  type CardDoc,
  type ListDoc,
  type UserDoc,
} from "../db/models";

export type Loaders = ReturnType<typeof createLoaders>;

export type Context = {
  /** Signed-in user's id, or null for anonymous requests. */
  userId: string | null;
  loaders: Loaders;
};

const ids = (keys: readonly string[]) => keys.map((k) => new Types.ObjectId(k));

function byId<T extends { _id: Types.ObjectId }>(keys: readonly string[], docs: T[]) {
  const map = new Map(docs.map((d) => [d._id.toString(), d]));
  return keys.map((k) => map.get(k) ?? null);
}

function groupBy<T>(keys: readonly string[], docs: T[], key: (d: T) => Types.ObjectId) {
  const map = new Map<string, T[]>(keys.map((k) => [k, []]));
  for (const d of docs) map.get(key(d).toString())?.push(d);
  return keys.map((k) => map.get(k) ?? []);
}

/** Per-request loaders, so resolvers don't issue one query per list or card. */
export function createLoaders() {
  return {
    userById: new DataLoader<string, UserDoc | null>(async (keys) =>
      byId(keys, await UserModel.find({ _id: { $in: ids(keys) } }).lean<UserDoc[]>()),
    ),
    boardById: new DataLoader<string, BoardDoc | null>(async (keys) =>
      byId(keys, await BoardModel.find({ _id: { $in: ids(keys) } }).lean<BoardDoc[]>()),
    ),
    listsByBoard: new DataLoader<string, ListDoc[]>(async (keys) =>
      groupBy(
        keys,
        await ListModel.find({ boardId: { $in: ids(keys) }, archived: false })
          .sort({ position: 1 })
          .lean<ListDoc[]>(),
        (l) => l.boardId,
      ),
    ),
    cardsByList: new DataLoader<string, CardDoc[]>(async (keys) =>
      groupBy(
        keys,
        await CardModel.find({ listId: { $in: ids(keys) }, archived: false })
          .sort({ position: 1 })
          .lean<CardDoc[]>(),
        (c) => c.listId,
      ),
    ),
  };
}

export function createContext(userId: string | null): Context {
  return { userId, loaders: createLoaders() };
}
