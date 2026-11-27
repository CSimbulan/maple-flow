import mongoose, { Schema, type Model, type Types } from "mongoose";
import { PRIORITIES, type Priority } from "../../lib/priority";

// Explicit interfaces: Mongoose's InferSchemaType is slow enough to exhaust tsc's memory here.
type Timestamps = { createdAt: Date; updatedAt: Date };

export interface UserDoc extends Timestamps {
  _id: Types.ObjectId;
  email: string;
  name: string | null;
  image: string | null;
}

export interface OrganizationDoc extends Timestamps {
  _id: Types.ObjectId;
  name: string;
  ownerId: Types.ObjectId;
  /** Everyone in the organization, owner included. They can open every board in its projects. */
  memberIds: Types.ObjectId[];
}

export interface ProjectDoc extends Timestamps {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
}

export interface BoardDoc extends Timestamps {
  _id: Types.ObjectId;
  /** Null only for boards created before projects existed, until their owner's next visit. */
  projectId: Types.ObjectId | null;
  title: string;
  /** Who created the board. They (and the org owner) can delete it and remove guests. */
  ownerId: Types.ObjectId;
  /**
   * People added to this board directly: its creator and guests invited with Share. Members of
   * the board's organization have access without being listed here.
   */
  memberIds: Types.ObjectId[];
  background: string;
  /**
   * Tags cards on this board can carry. Missing (not empty) on boards from before tags existed,
   * until the board is next loaded and gets the defaults.
   */
  tags?: TagDoc[];
}

export interface TagDoc {
  _id: Types.ObjectId;
  name: string;
  /** Hex color; tags show white text on it. */
  color: string;
}

export interface ListDoc extends Timestamps {
  _id: Types.ObjectId;
  boardId: Types.ObjectId;
  title: string;
  position: string;
  /** Header color (hex). Null on lists from before colors existed, until their board is opened. */
  color: string | null;
  archived: boolean;
}

export interface CardDoc extends Timestamps {
  _id: Types.ObjectId;
  boardId: Types.ObjectId;
  listId: Types.ObjectId;
  title: string;
  description: string;
  /** Ids of tags from the card's board. Tags deleted from the board are pulled from here. */
  tagIds: Types.ObjectId[];
  /** Null (or missing, on cards from before priorities) when none is set. */
  priority: Priority | null;
  dueDate: Date | null;
  assigneeIds: Types.ObjectId[];
  position: string;
  archived: boolean;
}

const { ObjectId } = Schema.Types;

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: null },
    image: { type: String, default: null },
  },
  { timestamps: true },
);

const organizationSchema = new Schema<OrganizationDoc>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: ObjectId, ref: "User", required: true },
    memberIds: { type: [ObjectId], ref: "User", default: [], index: true },
  },
  { timestamps: true },
);

const projectSchema = new Schema<ProjectDoc>(
  {
    orgId: { type: ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const tagSchema = new Schema<TagDoc>({
  name: { type: String, required: true, trim: true },
  color: { type: String, required: true },
});

const boardSchema = new Schema<BoardDoc>(
  {
    projectId: { type: ObjectId, ref: "Project", default: null, index: true },
    title: { type: String, required: true, trim: true },
    ownerId: { type: ObjectId, ref: "User", required: true },
    memberIds: { type: [ObjectId], ref: "User", default: [], index: true },
    background: { type: String, default: "#c62828" },
    // No default: "missing" means the board still needs its default tags (see tagsOf).
    tags: { type: [tagSchema], default: undefined },
  },
  { timestamps: true },
);

const listSchema = new Schema<ListDoc>(
  {
    boardId: { type: ObjectId, ref: "Board", required: true },
    title: { type: String, required: true, trim: true },
    position: { type: String, required: true },
    color: { type: String, default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
listSchema.index({ boardId: 1, position: 1 });

const cardSchema = new Schema<CardDoc>(
  {
    boardId: { type: ObjectId, ref: "Board", required: true, index: true },
    listId: { type: ObjectId, ref: "List", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    tagIds: { type: [ObjectId], default: [] },
    priority: { type: String, enum: PRIORITIES, default: null },
    dueDate: { type: Date, default: null },
    assigneeIds: { type: [ObjectId], ref: "User", default: [] },
    position: { type: String, required: true },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
cardSchema.index({ listId: 1, position: 1 });

function model<T>(name: string, schema: Schema<T>): Model<T> {
  // Next.js dev reloads re-run this file, so a model can already exist. Replace it rather than
  // reuse it: a reused model keeps its old schema, and Mongoose silently drops fields it doesn't
  // know when saving (new list colors were never stored until the server restarted).
  if (mongoose.models[name]) mongoose.deleteModel(name);
  return mongoose.model<T>(name, schema);
}

export const UserModel = model("User", userSchema);
export const OrganizationModel = model("Organization", organizationSchema);
export const ProjectModel = model("Project", projectSchema);
export const BoardModel = model("Board", boardSchema);
export const ListModel = model("List", listSchema);
export const CardModel = model("Card", cardSchema);
