import { lexicographicSortSchema } from "graphql";
import type { Model, Types } from "mongoose";
import { z } from "zod";
import { initialPositions, insertIndex, planInsert } from "../../lib/position";
import {
  BoardModel,
  CardModel,
  LABEL_COLORS,
  ListModel,
  UserModel,
  type BoardDoc,
  type CardDoc,
  type ListDoc,
  type UserDoc,
} from "../db/models";
import { createBuilder } from "./builder";
import type { Context } from "./context";
import { badInput, forbidden, notFound, objectId, parse } from "./errors";
import {
  requireBoardMember,
  requireBoardOwner,
  requireCard,
  requireList,
  requireUserId,
} from "./permissions";
import { defineTypes } from "./types";

const title = z.string().trim().min(1, "Title can't be empty").max(200);
const background = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Background must be a hex color");
const description = z.string().max(10_000);
const labels = z.array(z.enum(LABEL_COLORS)).max(LABEL_COLORS.length);
const dueDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })]).nullable();
const email = z.email().transform((e) => e.toLowerCase());

const DEFAULT_LISTS = ["To do", "Doing", "Done"];

/** Fresh board doc, replacing whatever the loader cached earlier in this request. */
async function reloadBoard(ctx: Context, boardId: string | Types.ObjectId): Promise<BoardDoc> {
  const id = boardId.toString();
  const board = await BoardModel.findById(id).lean<BoardDoc>();
  if (!board) throw notFound("Board");
  ctx.loaders.boardById.clear(id).prime(id, board);
  ctx.loaders.listsByBoard.clear(id);
  return board;
}

type PositionedDoc = { _id: Types.ObjectId; position: string };

/**
 * Position for an item moving into the group matched by `filter`, between
 * `beforeId` (directly above) and `afterId` (directly below).
 */
async function positionIn(
  model: Model<ListDoc> | Model<CardDoc>,
  filter: Record<string, unknown>,
  movingId: Types.ObjectId | null,
  beforeId?: string | null,
  afterId?: string | null,
): Promise<string> {
  const m = model as unknown as Model<PositionedDoc>;
  const query: Record<string, unknown> = { ...filter, archived: false };
  if (movingId) query._id = { $ne: movingId };
  const docs = await m.find(query).sort({ position: 1 }).select({ position: 1 }).lean();
  const siblings = docs.map((d) => ({ id: d._id.toString(), position: d.position }));
  const index = insertIndex(siblings, beforeId, afterId);
  if (index === -1) throw badInput("beforeId/afterId must be items in the target group");
  const plan = planInsert(siblings, index);
  if (plan.rebalance.length > 0) {
    await m.bulkWrite(
      plan.rebalance.map((r) => ({
        updateOne: { filter: { _id: r.id }, update: { $set: { position: r.position } } },
      })),
    );
  }
  return plan.position;
}

/** Builds the whole schema on a fresh builder (see createBuilder for why). */
export function buildSchema() {
  const parts = createBuilder();
  const { builder, UserRef, BoardRef, ListRef, CardRef, MoveCardPayloadRef } = parts;
  defineTypes(parts);

  builder.queryType({
    fields: (t) => ({
      me: t.field({
        type: UserRef,
        nullable: true,
        resolve: (_root, _args, ctx) => (ctx.userId ? ctx.loaders.userById.load(ctx.userId) : null),
      }),
      boards: t.field({
        type: [BoardRef],
        resolve: async (_root, _args, ctx) => {
          const userId = requireUserId(ctx);
          return BoardModel.find({ memberIds: userId }).sort({ updatedAt: -1 }).lean<BoardDoc[]>();
        },
      }),
      board: t.field({
        type: BoardRef,
        nullable: true,
        args: { id: t.arg.id({ required: true }) },
        resolve: (_root, { id }, ctx) => requireBoardMember(ctx, id).catch(() => null),
      }),
    }),
  });

  builder.mutationType({
    fields: (t) => ({
      // ---- Boards ----
      createBoard: t.field({
        type: BoardRef,
        args: { title: t.arg.string({ required: true }), background: t.arg.string() },
        resolve: async (_root, args, ctx) => {
          const userId = requireUserId(ctx);
          const input = parse(z.object({ title, background: background.nullish() }), args);
          const board = await BoardModel.create({
            title: input.title,
            ...(input.background ? { background: input.background } : {}),
            ownerId: userId,
            memberIds: [userId],
          });
          const positions = initialPositions(DEFAULT_LISTS.length);
          await ListModel.insertMany(
            DEFAULT_LISTS.map((listTitle, i) => ({
              boardId: board._id,
              title: listTitle,
              position: positions[i],
            })),
          );
          return reloadBoard(ctx, board._id);
        },
      }),
      updateBoard: t.field({
        type: BoardRef,
        args: {
          id: t.arg.id({ required: true }),
          title: t.arg.string(),
          background: t.arg.string(),
        },
        resolve: async (_root, args, ctx) => {
          await requireBoardMember(ctx, args.id);
          const input = parse(
            z.object({ title: title.nullish(), background: background.nullish() }),
            args,
          );
          const $set: Record<string, unknown> = {};
          if (input.title) $set.title = input.title;
          if (input.background) $set.background = input.background;
          await BoardModel.updateOne({ _id: args.id }, { $set });
          return reloadBoard(ctx, args.id);
        },
      }),
      deleteBoard: t.id({
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          await requireBoardOwner(ctx, id);
          await Promise.all([
            CardModel.deleteMany({ boardId: id }),
            ListModel.deleteMany({ boardId: id }),
            BoardModel.deleteOne({ _id: id }),
          ]);
          return id;
        },
      }),
      addBoardMember: t.field({
        type: BoardRef,
        args: { boardId: t.arg.id({ required: true }), email: t.arg.string({ required: true }) },
        resolve: async (_root, args, ctx) => {
          await requireBoardMember(ctx, args.boardId);
          const input = parse(z.object({ email }), args);
          const user = await UserModel.findOne({ email: input.email }).lean<UserDoc>();
          if (!user) throw badInput("No one with that email has signed in to Maple Flow yet");
          await BoardModel.updateOne({ _id: args.boardId }, { $addToSet: { memberIds: user._id } });
          return reloadBoard(ctx, args.boardId);
        },
      }),
      removeBoardMember: t.field({
        type: BoardRef,
        args: { boardId: t.arg.id({ required: true }), userId: t.arg.id({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardOwner(ctx, args.boardId);
          const userId = objectId(args.userId, "User");
          if (board.ownerId.equals(userId)) throw forbidden("The owner can't be removed");
          await BoardModel.updateOne({ _id: board._id }, { $pull: { memberIds: userId } });
          await CardModel.updateMany({ boardId: board._id }, { $pull: { assigneeIds: userId } });
          return reloadBoard(ctx, board._id);
        },
      }),

      // ---- Lists ----
      createList: t.field({
        type: BoardRef,
        args: { boardId: t.arg.id({ required: true }), title: t.arg.string({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardMember(ctx, args.boardId);
          const input = parse(z.object({ title }), args);
          const position = await positionIn(ListModel, { boardId: board._id }, null);
          await ListModel.create({ boardId: board._id, title: input.title, position });
          return reloadBoard(ctx, board._id);
        },
      }),
      renameList: t.field({
        type: ListRef,
        args: { id: t.arg.id({ required: true }), title: t.arg.string({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const list = await requireList(ctx, args.id);
          const input = parse(z.object({ title }), args);
          return (await ListModel.findByIdAndUpdate(
            list._id,
            { $set: { title: input.title } },
            { returnDocument: "after" },
          ).lean<ListDoc>())!;
        },
      }),
      moveList: t.field({
        type: BoardRef,
        args: { id: t.arg.id({ required: true }), beforeId: t.arg.id(), afterId: t.arg.id() },
        resolve: async (_root, args, ctx) => {
          const list = await requireList(ctx, args.id);
          const position = await positionIn(
            ListModel,
            { boardId: list.boardId },
            list._id,
            args.beforeId,
            args.afterId,
          );
          await ListModel.updateOne({ _id: list._id }, { $set: { position } });
          return reloadBoard(ctx, list.boardId);
        },
      }),
      archiveList: t.field({
        type: BoardRef,
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          const list = await requireList(ctx, id);
          await ListModel.updateOne({ _id: list._id }, { $set: { archived: true } });
          return reloadBoard(ctx, list.boardId);
        },
      }),

      // ---- Cards ----
      createCard: t.field({
        type: ListRef,
        args: { listId: t.arg.id({ required: true }), title: t.arg.string({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const list = await requireList(ctx, args.listId);
          const input = parse(z.object({ title }), args);
          const position = await positionIn(CardModel, { listId: list._id }, null);
          await CardModel.create({
            boardId: list.boardId,
            listId: list._id,
            title: input.title,
            position,
          });
          return list;
        },
      }),
      updateCard: t.field({
        type: CardRef,
        args: {
          id: t.arg.id({ required: true }),
          title: t.arg.string(),
          description: t.arg.string(),
          labels: t.arg.stringList(),
          dueDate: t.arg.string(),
          assigneeIds: t.arg.idList(),
        },
        resolve: async (_root, args, ctx) => {
          const card = await requireCard(ctx, args.id);
          const input = parse(
            z.object({
              title: title.nullish(),
              description: description.nullish(),
              labels: labels.nullish(),
              dueDate: dueDate.optional(),
              assigneeIds: z.array(z.string()).nullish(),
            }),
            args,
          );
          const $set: Record<string, unknown> = {};
          if (input.title) $set.title = input.title;
          if (input.description != null) $set.description = input.description;
          if (input.labels) $set.labels = [...new Set(input.labels)];
          // An explicit null clears the due date; leaving the argument out keeps it.
          if (input.dueDate !== undefined) {
            $set.dueDate = input.dueDate ? new Date(input.dueDate) : null;
          }
          if (input.assigneeIds) {
            const board = (await ctx.loaders.boardById.load(card.boardId.toString()))!;
            const members = new Set(board.memberIds.map(String));
            const unique = [...new Set(input.assigneeIds)];
            if (unique.some((id) => !members.has(id))) {
              throw badInput("Assignees must be members of the board");
            }
            $set.assigneeIds = unique;
          }
          return (await CardModel.findByIdAndUpdate(
            card._id,
            { $set },
            {
              returnDocument: "after",
            },
          ).lean<CardDoc>())!;
        },
      }),
      moveCard: t.field({
        type: MoveCardPayloadRef,
        args: {
          id: t.arg.id({ required: true }),
          toListId: t.arg.id({ required: true }),
          beforeId: t.arg.id(),
          afterId: t.arg.id(),
        },
        resolve: async (_root, args, ctx) => {
          const card = await requireCard(ctx, args.id);
          const fromList = (await ListModel.findById(card.listId).lean<ListDoc>())!;
          const toList = await requireList(ctx, args.toListId);
          if (!toList.boardId.equals(card.boardId))
            throw badInput("Cards can't move between boards");
          const position = await positionIn(
            CardModel,
            { listId: toList._id },
            card._id,
            args.beforeId,
            args.afterId,
          );
          const moved = (await CardModel.findByIdAndUpdate(
            card._id,
            { $set: { listId: toList._id, position } },
            { returnDocument: "after" },
          ).lean<CardDoc>())!;
          return { card: moved, fromList, toList };
        },
      }),
      archiveCard: t.field({
        type: ListRef,
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          const card = await requireCard(ctx, id);
          await CardModel.updateOne({ _id: card._id }, { $set: { archived: true } });
          return (await ListModel.findById(card.listId).lean<ListDoc>())!;
        },
      }),
    }),
  });

  return lexicographicSortSchema(builder.toSchema());
}

export const schema = buildSchema();
