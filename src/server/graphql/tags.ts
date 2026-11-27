import { DEFAULT_TAGS } from "../../lib/tags";
import { BoardModel, type BoardDoc, type TagDoc } from "../db/models";

/**
 * A board's tags. Boards from before tags existed have none stored yet; they get the default
 * tags the first time they're needed (a lazy migration, like ensureWorkspace). The doc passed in
 * is updated in place, so the request's cached copy agrees.
 */
export async function tagsOf(board: BoardDoc): Promise<TagDoc[]> {
  if (board.tags) return board.tags;
  // Only if still missing, so two requests at once don't both add a set. Seeding isn't an edit,
  // so it leaves updatedAt (which orders the board tiles) alone.
  await BoardModel.updateOne(
    { _id: board._id, tags: { $exists: false } },
    { $set: { tags: DEFAULT_TAGS.map((t) => ({ ...t })) } },
    { timestamps: false },
  );
  const fresh = await BoardModel.findById(board._id).select({ tags: 1 }).lean<BoardDoc>();
  board.tags = fresh?.tags ?? [];
  return board.tags;
}

/** Case-insensitive name match, so "bug" and "Bug" can't both exist on one board. */
export function sameTagName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
