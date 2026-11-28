import { z } from "zod";
import {
  ActivityModel,
  CommentModel,
  type ActivityDoc,
  type CardDoc,
  type CommentDoc,
  type UserDoc,
} from "../db/models";
import type { SchemaParts } from "./builder";
import type { Context } from "./context";
import { forbidden, notFound, objectId, parse } from "./errors";
import { requireCard, requireUserId } from "./permissions";

const commentText = z.string().trim().min(1, "Comment can't be empty").max(5_000);

async function user(ctx: Context, id: { toString(): string }): Promise<UserDoc | null> {
  return ctx.loaders.userById.load(id.toString());
}

/** The comment, if the caller can open its card. */
async function requireComment(ctx: Context, id: string): Promise<CommentDoc> {
  const comment = await CommentModel.findById(objectId(id, "Comment")).lean<CommentDoc>();
  if (!comment) throw notFound("Comment");
  await requireCard(ctx, comment.cardId.toString(), { archived: "any" }).catch(() => {
    throw notFound("Comment");
  });
  return comment;
}

/** The comment, if the caller wrote it. */
async function requireOwnComment(ctx: Context, id: string): Promise<CommentDoc> {
  const comment = await requireComment(ctx, id);
  if (comment.authorId.toString() !== requireUserId(ctx)) {
    throw forbidden("Only the comment's author can change it");
  }
  return comment;
}

/** Comments and activity on cards: the types, Card.comments/activity, Query.card, mutations. */
export function defineCommentSchema({
  builder,
  UserRef,
  CardRef,
  CommentRef,
  ActivityRef,
  ActivityKindEnum,
}: SchemaParts) {
  builder.objectType(CommentRef, {
    fields: (t) => ({
      id: t.id({ resolve: (c) => c._id.toString() }),
      text: t.exposeString("text"),
      author: t.field({
        type: UserRef,
        nullable: true,
        resolve: (c, _args, ctx) => user(ctx, c.authorId),
      }),
      createdAt: t.string({ resolve: (c) => c.createdAt.toISOString() }),
      editedAt: t.string({
        nullable: true,
        description: "When the text was last edited; null if never.",
        resolve: (c) => c.editedAt?.toISOString() ?? null,
      }),
      viewerIsAuthor: t.boolean({
        description: "Whether the viewer wrote it, and so can edit and delete it.",
        resolve: (c, _args, ctx) => c.authorId.toString() === ctx.userId,
      }),
    }),
  });

  builder.objectType(ActivityRef, {
    description: "Something someone did to a card.",
    fields: (t) => ({
      id: t.id({ resolve: (a) => a._id.toString() }),
      kind: t.field({ type: ActivityKindEnum, resolve: (a) => a.kind }),
      actor: t.field({
        type: UserRef,
        nullable: true,
        resolve: (a, _args, ctx) => user(ctx, a.actorId),
      }),
      createdAt: t.string({ resolve: (a) => a.createdAt.toISOString() }),
      from: t.exposeString("from", {
        nullable: true,
        description:
          "Old value: list title (MOVED), card title (RENAMED), YYYY-MM-DD (DUE_DATE) or " +
          "Priority value (PRIORITY). Null means none.",
      }),
      to: t.exposeString("to", {
        nullable: true,
        description: "New value, like `from`; also the list for CREATED and RESTORED.",
      }),
      added: t.stringList({
        description: "Tag names added (TAGS).",
        resolve: (a) => (a.kind === "TAGS" ? a.added : []),
      }),
      removed: t.stringList({
        description: "Tag names removed (TAGS).",
        resolve: (a) => (a.kind === "TAGS" ? a.removed : []),
      }),
      addedUsers: t.field({
        type: [UserRef],
        description: "People assigned (ASSIGNEES).",
        resolve: (a, _args, ctx) => (a.kind === "ASSIGNEES" ? users(ctx, a.added) : []),
      }),
      removedUsers: t.field({
        type: [UserRef],
        description: "People unassigned (ASSIGNEES).",
        resolve: (a, _args, ctx) => (a.kind === "ASSIGNEES" ? users(ctx, a.removed) : []),
      }),
    }),
  });

  builder.objectFields(CardRef, (t) => ({
    comments: t.field({
      type: [CommentRef],
      description: "Comments on the card, oldest first.",
      resolve: (c) =>
        CommentModel.find({ cardId: c._id }).sort({ createdAt: 1, _id: 1 }).lean<CommentDoc[]>(),
    }),
    activity: t.field({
      type: [ActivityRef],
      description: "What people did to the card, oldest first.",
      resolve: (c) =>
        ActivityModel.find({ cardId: c._id }).sort({ createdAt: 1, _id: 1 }).lean<ActivityDoc[]>(),
    }),
  }));

  builder.queryFields((t) => ({
    card: t.field({
      type: CardRef,
      nullable: true,
      description: "A card (active or archived), or null if the viewer can't open it.",
      args: { id: t.arg.id({ required: true }) },
      resolve: (_root, { id }, ctx) =>
        requireCard(ctx, id, { archived: "any" }).catch(() => null) as Promise<CardDoc | null>,
    }),
  }));

  builder.mutationFields((t) => ({
    addComment: t.field({
      type: CardRef,
      description: "Comment on an active card. Returns the card with its comments.",
      args: { cardId: t.arg.id({ required: true }), text: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const card = await requireCard(ctx, args.cardId);
        const { text } = parse(z.object({ text: commentText }), args);
        await CommentModel.create({
          cardId: card._id,
          boardId: card.boardId,
          authorId: requireUserId(ctx),
          text,
        });
        return card;
      },
    }),
    updateComment: t.field({
      type: CommentRef,
      description: "Change the text of a comment you wrote.",
      args: { id: t.arg.id({ required: true }), text: t.arg.string({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const comment = await requireOwnComment(ctx, args.id);
        const { text } = parse(z.object({ text: commentText }), args);
        if (text === comment.text) return comment;
        return (await CommentModel.findByIdAndUpdate(
          comment._id,
          { $set: { text, editedAt: new Date() } },
          { returnDocument: "after" },
        ).lean<CommentDoc>())!;
      },
    }),
    deleteComment: t.field({
      type: CardRef,
      description: "Delete a comment you wrote. Returns its card with the remaining comments.",
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, { id }, ctx) => {
        const comment = await requireOwnComment(ctx, id);
        await CommentModel.deleteOne({ _id: comment._id });
        return requireCard(ctx, comment.cardId.toString(), { archived: "any" });
      },
    }),
  }));
}

async function users(ctx: Context, ids: string[]): Promise<UserDoc[]> {
  const found = await ctx.loaders.userById.loadMany(ids);
  return found.filter((u): u is UserDoc => !!u && !(u instanceof Error));
}
