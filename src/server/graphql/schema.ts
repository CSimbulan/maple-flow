import { lexicographicSortSchema } from "graphql";
import type { Model, Types } from "mongoose";
import { z } from "zod";
import { defaultListColor } from "../../lib/list-colors";
import { initialPositions, insertIndex, planInsert } from "../../lib/position";
import { PRIORITIES } from "../../lib/priority";
import { DEFAULT_TAGS } from "../../lib/tags";
import {
  ActivityModel,
  BoardModel,
  CardModel,
  CommentModel,
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
import { sameTagName, tagsOf } from "./tags";
import { defineWorkspaceSchema } from "./workspaces";
import { cardChanges, creationEntries, logActivity } from "./activity";
import { defineCommentSchema } from "./comments";
import { deleteCardHistory } from "../db/cascade";
import {
  boardAudienceIds,
  canOpenBoard,
  requireBoardAccess,
  requireBoardManager,
  requireCard,
  requireList,
  requireProject,
  requireUserId,
} from "./permissions";
import { defineTypes } from "./types";

const title = z.string().trim().min(1, "Title can't be empty").max(200);
const background = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Background must be a hex color");
const listColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex color");
const description = z.string().max(10_000);
const tagName = z.string().trim().min(1, "Tag name can't be empty").max(40);
const tagColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex color");
const MAX_TAGS = 50;
const dueDate = z.union([z.iso.date(), z.iso.datetime({ offset: true })]).nullable();
const email = z.email().transform((e) => e.toLowerCase());

const DEFAULT_LISTS = ["To do", "Doing", "Done"];

/** Card fields besides the title, shared by createCard and updateCard. All optional. */
const cardDetails = z.object({
  description: description.nullish(),
  tagIds: z.array(z.string()).max(MAX_TAGS).nullish(),
  dueDate: dueDate.optional(),
  priority: z.enum(PRIORITIES).nullable().optional(),
  assigneeIds: z.array(z.string()).nullish(),
});

/**
 * The fields to store for the given card details, after checking that tags belong to the
 * board and assignees can open it. Arguments left out are left out here too.
 */
async function cardDetailsSet(
  ctx: Context,
  boardId: Types.ObjectId,
  input: z.infer<typeof cardDetails>,
): Promise<Record<string, unknown>> {
  const $set: Record<string, unknown> = {};
  if (input.description != null) $set.description = input.description;
  if (input.tagIds || input.assigneeIds) {
    const board = (await ctx.loaders.boardById.load(boardId.toString()))!;
    if (input.tagIds) {
      const onBoard = new Set((await tagsOf(board)).map((tag) => tag._id.toString()));
      const unique = [...new Set(input.tagIds)];
      if (unique.some((id) => !onBoard.has(id))) {
        throw badInput("Tags must belong to the card's board");
      }
      $set.tagIds = unique;
    }
    if (input.assigneeIds) {
      const members = new Set(await boardAudienceIds(ctx, board));
      const unique = [...new Set(input.assigneeIds)];
      if (unique.some((id) => !members.has(id))) {
        throw badInput("Assignees must be members of the board");
      }
      $set.assigneeIds = unique;
    }
  }
  // An explicit null clears the due date or priority; leaving the argument out keeps it.
  if (input.dueDate !== undefined) {
    $set.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.priority !== undefined) $set.priority = input.priority;
  return $set;
}

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
  const {
    builder,
    UserRef,
    BoardRef,
    ListRef,
    CardRef,
    MoveCardPayloadRef,
    RestoreCardPayloadRef,
    RestoreListPayloadRef,
    DeleteCardPayloadRef,
    DeleteListPayloadRef,
    PriorityEnum,
  } = parts;
  defineTypes(parts);
  defineWorkspaceSchema(parts);
  defineCommentSchema(parts);

  builder.queryType({
    fields: (t) => ({
      me: t.field({
        type: UserRef,
        nullable: true,
        resolve: (_root, _args, ctx) => (ctx.userId ? ctx.loaders.userById.load(ctx.userId) : null),
      }),
      board: t.field({
        type: BoardRef,
        nullable: true,
        args: { id: t.arg.id({ required: true }) },
        resolve: (_root, { id }, ctx) => requireBoardAccess(ctx, id).catch(() => null),
      }),
    }),
  });

  builder.mutationType({
    fields: (t) => ({
      // ---- Boards ----
      createBoard: t.field({
        type: BoardRef,
        args: {
          projectId: t.arg.id({ required: true }),
          title: t.arg.string({ required: true }),
          background: t.arg.string(),
        },
        resolve: async (_root, args, ctx) => {
          const userId = requireUserId(ctx);
          const { project } = await requireProject(ctx, args.projectId);
          const input = parse(z.object({ title, background: background.nullish() }), args);
          // Workspace members get access through the workspace; memberIds holds guests only.
          const board = await BoardModel.create({
            projectId: project._id,
            title: input.title,
            ...(input.background ? { background: input.background } : {}),
            ownerId: userId,
            memberIds: [],
            tags: DEFAULT_TAGS.map((tag) => ({ ...tag })),
          });
          ctx.loaders.boardsByProject.clear(project._id.toString());
          const positions = initialPositions(DEFAULT_LISTS.length);
          await ListModel.insertMany(
            DEFAULT_LISTS.map((listTitle, i) => ({
              boardId: board._id,
              title: listTitle,
              position: positions[i],
              color: defaultListColor(i),
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
          await requireBoardAccess(ctx, args.id);
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
          await requireBoardManager(ctx, id);
          await Promise.all([
            CommentModel.deleteMany({ boardId: id }),
            ActivityModel.deleteMany({ boardId: id }),
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
          const board = await requireBoardAccess(ctx, args.boardId);
          const input = parse(z.object({ email }), args);
          const user = await UserModel.findOne({ email: input.email }).lean<UserDoc>();
          if (!user) throw badInput("No one with that email has signed in to Maple Flow yet");
          if (await canOpenBoard(ctx, board, user._id.toString())) {
            throw badInput(`${input.email} can already open this board`);
          }
          await BoardModel.updateOne({ _id: args.boardId }, { $addToSet: { memberIds: user._id } });
          return reloadBoard(ctx, args.boardId);
        },
      }),
      removeBoardMember: t.field({
        type: BoardRef,
        args: { boardId: t.arg.id({ required: true }), userId: t.arg.id({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardManager(ctx, args.boardId);
          const userId = objectId(args.userId, "User");
          if (board.ownerId.equals(userId)) throw forbidden("The board's creator can't be removed");
          await BoardModel.updateOne({ _id: board._id }, { $pull: { memberIds: userId } });
          const fresh = await reloadBoard(ctx, board._id);
          // Workspace members keep access, so only unassign people who actually lost it.
          if (!(await canOpenBoard(ctx, fresh, args.userId))) {
            await CardModel.updateMany({ boardId: board._id }, { $pull: { assigneeIds: userId } });
          }
          return fresh;
        },
      }),

      // ---- Tags ----
      createTag: t.field({
        type: BoardRef,
        description: "Add a tag to the board's list of tags. Names are unique per board.",
        args: {
          boardId: t.arg.id({ required: true }),
          name: t.arg.string({ required: true }),
          color: t.arg.string({ required: true }),
        },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardAccess(ctx, args.boardId);
          const input = parse(z.object({ name: tagName, color: tagColor }), args);
          const tags = await tagsOf(board);
          if (tags.length >= MAX_TAGS) throw badInput(`A board can have up to ${MAX_TAGS} tags`);
          if (tags.some((tag) => sameTagName(tag.name, input.name))) {
            throw badInput(`There's already a tag called “${input.name}”`);
          }
          await BoardModel.updateOne({ _id: board._id }, { $push: { tags: input } });
          return reloadBoard(ctx, board._id);
        },
      }),
      updateTag: t.field({
        type: BoardRef,
        args: {
          boardId: t.arg.id({ required: true }),
          tagId: t.arg.id({ required: true }),
          name: t.arg.string(),
          color: t.arg.string(),
        },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardAccess(ctx, args.boardId);
          const input = parse(
            z.object({ name: tagName.nullish(), color: tagColor.nullish() }),
            args,
          );
          const tags = await tagsOf(board);
          const tag = tags.find((x) => x._id.toString() === args.tagId);
          if (!tag) throw notFound("Tag");
          if (input.name && tags.some((x) => x !== tag && sameTagName(x.name, input.name!))) {
            throw badInput(`There's already a tag called “${input.name}”`);
          }
          const $set: Record<string, unknown> = {};
          if (input.name) $set["tags.$.name"] = input.name;
          if (input.color) $set["tags.$.color"] = input.color;
          await BoardModel.updateOne({ _id: board._id, "tags._id": tag._id }, { $set });
          return reloadBoard(ctx, board._id);
        },
      }),
      deleteTag: t.field({
        type: BoardRef,
        description: "Remove a tag from the board and from every card that has it.",
        args: { boardId: t.arg.id({ required: true }), tagId: t.arg.id({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardAccess(ctx, args.boardId);
          const tag = (await tagsOf(board)).find((x) => x._id.toString() === args.tagId);
          if (!tag) throw notFound("Tag");
          await BoardModel.updateOne({ _id: board._id }, { $pull: { tags: { _id: tag._id } } });
          await CardModel.updateMany({ boardId: board._id }, { $pull: { tagIds: tag._id } });
          return reloadBoard(ctx, board._id);
        },
      }),

      // ---- Lists ----
      createList: t.field({
        type: BoardRef,
        description:
          "Add a list at the end of the board. Without `color` it gets the next default " +
          "color for its place (the board's first list blue, the second green, and so on).",
        args: {
          boardId: t.arg.id({ required: true }),
          title: t.arg.string({ required: true }),
          color: t.arg.string(),
        },
        resolve: async (_root, args, ctx) => {
          const board = await requireBoardAccess(ctx, args.boardId);
          const input = parse(z.object({ title, color: listColor.nullish() }), args);
          const position = await positionIn(ListModel, { boardId: board._id }, null);
          const color =
            input.color ??
            defaultListColor(
              await ListModel.countDocuments({ boardId: board._id, archived: false }),
            );
          await ListModel.create({ boardId: board._id, title: input.title, position, color });
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
      updateListColor: t.field({
        type: ListRef,
        args: { id: t.arg.id({ required: true }), color: t.arg.string({ required: true }) },
        resolve: async (_root, args, ctx) => {
          const list = await requireList(ctx, args.id);
          const input = parse(z.object({ color: listColor }), args);
          return (await ListModel.findByIdAndUpdate(
            list._id,
            { $set: { color: input.color } },
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
      deleteList: t.field({
        type: DeleteListPayloadRef,
        description:
          "Permanently delete a list (active or archived) and every card in it, " +
          "including archived ones. Can't be undone.",
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          const list = await requireList(ctx, id, { archived: "any" });
          const cards = await CardModel.find({ listId: list._id })
            .select({ _id: 1 })
            .lean<{ _id: Types.ObjectId }[]>();
          await deleteCardHistory(cards.map((c) => c._id));
          await CardModel.deleteMany({ listId: list._id });
          await ListModel.deleteOne({ _id: list._id });
          return { deletedId: id, board: await reloadBoard(ctx, list.boardId) };
        },
      }),
      deleteCard: t.field({
        type: DeleteCardPayloadRef,
        description: "Permanently delete a card (active or archived). Can't be undone.",
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          const card = await requireCard(ctx, id, { archived: "any" });
          await deleteCardHistory([card._id]);
          await CardModel.deleteOne({ _id: card._id });
          const list = (await ListModel.findById(card.listId).lean<ListDoc>())!;
          return { deletedId: id, list, board: await reloadBoard(ctx, card.boardId) };
        },
      }),
      restoreList: t.field({
        type: RestoreListPayloadRef,
        description:
          "Un-archive a list, with the cards it had, at the end of the board's lists. " +
          "Cards archived on their own stay archived.",
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          const list = await requireList(ctx, id, { archived: true });
          const position = await positionIn(ListModel, { boardId: list.boardId }, null);
          const color =
            list.color ??
            defaultListColor(
              await ListModel.countDocuments({ boardId: list.boardId, archived: false }),
            );
          const restored = (await ListModel.findByIdAndUpdate(
            list._id,
            { $set: { archived: false, position, color } },
            { returnDocument: "after" },
          ).lean<ListDoc>())!;
          return { list: restored, board: await reloadBoard(ctx, list.boardId) };
        },
      }),

      // ---- Cards ----
      createCard: t.field({
        type: ListRef,
        description:
          "Add a card at the bottom of a list. The details are optional and checked like " +
          "updateCard's.",
        args: {
          listId: t.arg.id({ required: true }),
          title: t.arg.string({ required: true }),
          description: t.arg.string(),
          tagIds: t.arg.idList(),
          dueDate: t.arg.string(),
          priority: t.arg({ type: PriorityEnum }),
          assigneeIds: t.arg.idList(),
        },
        resolve: async (_root, args, ctx) => {
          const list = await requireList(ctx, args.listId);
          const input = parse(cardDetails.extend({ title }), args);
          const details = await cardDetailsSet(ctx, list.boardId, input);
          const position = await positionIn(CardModel, { listId: list._id }, null);
          const card = await CardModel.create({
            ...details,
            boardId: list.boardId,
            listId: list._id,
            title: input.title,
            position,
          });
          const board = (await ctx.loaders.boardById.load(list.boardId.toString()))!;
          await logActivity(ctx, card, creationEntries(list.title, details, await tagsOf(board)));
          return list;
        },
      }),
      updateCard: t.field({
        type: CardRef,
        args: {
          id: t.arg.id({ required: true }),
          title: t.arg.string(),
          description: t.arg.string(),
          tagIds: t.arg.idList(),
          dueDate: t.arg.string(),
          priority: t.arg({ type: PriorityEnum }),
          assigneeIds: t.arg.idList(),
        },
        resolve: async (_root, args, ctx) => {
          const card = await requireCard(ctx, args.id);
          const input = parse(cardDetails.extend({ title: title.nullish() }), args);
          const $set = await cardDetailsSet(ctx, card.boardId, input);
          if (input.title) $set.title = input.title;
          const board = (await ctx.loaders.boardById.load(card.boardId.toString()))!;
          await logActivity(ctx, card, cardChanges(card, $set, await tagsOf(board)));
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
          // Reordering within a list isn't recorded, only moves to another list.
          if (!fromList._id.equals(toList._id)) {
            await logActivity(ctx, card, [
              { kind: "MOVED", from: fromList.title, to: toList.title },
            ]);
          }
          return { card: moved, fromList, toList };
        },
      }),
      archiveCard: t.field({
        type: ListRef,
        args: { id: t.arg.id({ required: true }) },
        resolve: async (_root, { id }, ctx) => {
          const card = await requireCard(ctx, id);
          await CardModel.updateOne({ _id: card._id }, { $set: { archived: true } });
          await logActivity(ctx, card, [{ kind: "ARCHIVED" }]);
          return (await ListModel.findById(card.listId).lean<ListDoc>())!;
        },
      }),
      restoreCard: t.field({
        type: RestoreCardPayloadRef,
        description:
          "Un-archive a card, at the bottom of its original list or of `listId` if given. " +
          "If the original list is archived too, `listId` is required.",
        args: { id: t.arg.id({ required: true }), listId: t.arg.id() },
        resolve: async (_root, args, ctx) => {
          const card = await requireCard(ctx, args.id, { archived: true });
          const list = await ListModel.findOne({
            _id: objectId(args.listId ?? card.listId.toString(), "List"),
            archived: false,
          }).lean<ListDoc>();
          if (!list) {
            if (args.listId) throw notFound("List");
            throw badInput("This card's list is archived. Choose another list to restore it to.");
          }
          if (!list.boardId.equals(card.boardId)) throw badInput("Cards can't move between boards");
          const position = await positionIn(CardModel, { listId: list._id }, null);
          const restored = (await CardModel.findByIdAndUpdate(
            card._id,
            { $set: { archived: false, listId: list._id, position } },
            { returnDocument: "after" },
          ).lean<CardDoc>())!;
          await logActivity(ctx, card, [{ kind: "RESTORED", to: list.title }]);
          return { card: restored, list, board: await reloadBoard(ctx, card.boardId) };
        },
      }),
    }),
  });

  return lexicographicSortSchema(builder.toSchema());
}

export const schema = buildSchema();
