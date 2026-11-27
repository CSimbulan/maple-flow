import type { Types } from "mongoose";
import type { UserDoc } from "../db/models";
import { BoardRef, builder, CardRef, ListRef, MoveCardPayloadRef, UserRef } from "./builder";
import type { Context } from "./context";

async function loadUsers(ctx: Context, ids: Types.ObjectId[]): Promise<UserDoc[]> {
  const users = await ctx.loaders.userById.loadMany(ids.map(String));
  return users.filter((u): u is UserDoc => !!u && !(u instanceof Error));
}

builder.objectType(UserRef, {
  fields: (t) => ({
    id: t.id({ resolve: (u) => u._id.toString() }),
    email: t.exposeString("email"),
    name: t.exposeString("name", { nullable: true }),
    image: t.exposeString("image", { nullable: true }),
  }),
});

builder.objectType(BoardRef, {
  fields: (t) => ({
    id: t.id({ resolve: (b) => b._id.toString() }),
    title: t.exposeString("title"),
    background: t.exposeString("background"),
    owner: t.field({
      type: UserRef,
      resolve: async (b, _args, ctx) => (await ctx.loaders.userById.load(b.ownerId.toString()))!,
    }),
    members: t.field({ type: [UserRef], resolve: (b, _args, ctx) => loadUsers(ctx, b.memberIds) }),
    viewerIsOwner: t.boolean({ resolve: (b, _args, ctx) => b.ownerId.toString() === ctx.userId }),
    lists: t.field({
      type: [ListRef],
      resolve: (b, _args, ctx) => ctx.loaders.listsByBoard.load(b._id.toString()),
    }),
    updatedAt: t.string({ resolve: (b) => b.updatedAt.toISOString() }),
  }),
});

builder.objectType(ListRef, {
  fields: (t) => ({
    id: t.id({ resolve: (l) => l._id.toString() }),
    title: t.exposeString("title"),
    position: t.exposeString("position"),
    boardId: t.id({ resolve: (l) => l.boardId.toString() }),
    cards: t.field({
      type: [CardRef],
      resolve: (l, _args, ctx) => ctx.loaders.cardsByList.load(l._id.toString()),
    }),
  }),
});

builder.objectType(CardRef, {
  fields: (t) => ({
    id: t.id({ resolve: (c) => c._id.toString() }),
    title: t.exposeString("title"),
    description: t.exposeString("description"),
    labels: t.stringList({ resolve: (c) => c.labels }),
    dueDate: t.string({ nullable: true, resolve: (c) => c.dueDate?.toISOString() ?? null }),
    position: t.exposeString("position"),
    listId: t.id({ resolve: (c) => c.listId.toString() }),
    boardId: t.id({ resolve: (c) => c.boardId.toString() }),
    assignees: t.field({
      type: [UserRef],
      resolve: (c, _args, ctx) => loadUsers(ctx, c.assigneeIds),
    }),
  }),
});

builder.objectType(MoveCardPayloadRef, {
  fields: (t) => ({
    card: t.field({ type: CardRef, resolve: (p) => p.card }),
    fromList: t.field({ type: ListRef, resolve: (p) => p.fromList }),
    toList: t.field({ type: ListRef, resolve: (p) => p.toList }),
  }),
});
