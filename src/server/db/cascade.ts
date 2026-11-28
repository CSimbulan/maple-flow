import type { Types } from "mongoose";
import {
  ActivityModel,
  BoardModel,
  CardModel,
  CommentModel,
  ListModel,
  ProjectModel,
} from "./models";

/** Permanently delete cards' comments and activity (the cards themselves are left). */
export async function deleteCardHistory(cardIds: Types.ObjectId[]): Promise<void> {
  if (cardIds.length === 0) return;
  await Promise.all([
    CommentModel.deleteMany({ cardId: { $in: cardIds } }),
    ActivityModel.deleteMany({ cardId: { $in: cardIds } }),
  ]);
}

/** Permanently delete boards with all their lists, cards, comments and activity. */
export async function deleteBoards(boardIds: Types.ObjectId[]): Promise<void> {
  if (boardIds.length === 0) return;
  await CommentModel.deleteMany({ boardId: { $in: boardIds } });
  await ActivityModel.deleteMany({ boardId: { $in: boardIds } });
  await CardModel.deleteMany({ boardId: { $in: boardIds } });
  await ListModel.deleteMany({ boardId: { $in: boardIds } });
  await BoardModel.deleteMany({ _id: { $in: boardIds } });
}

/** Permanently delete projects with all their boards, lists and cards. */
export async function deleteProjects(projectIds: Types.ObjectId[]): Promise<void> {
  if (projectIds.length === 0) return;
  const boards = await BoardModel.find({ projectId: { $in: projectIds } })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId }[]>();
  await deleteBoards(boards.map((b) => b._id));
  await ProjectModel.deleteMany({ _id: { $in: projectIds } });
}
