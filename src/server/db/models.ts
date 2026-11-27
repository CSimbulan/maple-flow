import mongoose, { Schema, type Model, type Types } from "mongoose";

export const LABEL_COLORS = ["green", "yellow", "orange", "red", "purple", "blue"] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

// Explicit interfaces: Mongoose's InferSchemaType is slow enough to exhaust tsc's memory here.
type Timestamps = { createdAt: Date; updatedAt: Date };

export interface UserDoc extends Timestamps {
  _id: Types.ObjectId;
  email: string;
  name: string | null;
  image: string | null;
}

export interface BoardDoc extends Timestamps {
  _id: Types.ObjectId;
  title: string;
  ownerId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  background: string;
}

export interface ListDoc extends Timestamps {
  _id: Types.ObjectId;
  boardId: Types.ObjectId;
  title: string;
  position: string;
  archived: boolean;
}

export interface CardDoc extends Timestamps {
  _id: Types.ObjectId;
  boardId: Types.ObjectId;
  listId: Types.ObjectId;
  title: string;
  description: string;
  labels: LabelColor[];
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

const boardSchema = new Schema<BoardDoc>(
  {
    title: { type: String, required: true, trim: true },
    ownerId: { type: ObjectId, ref: "User", required: true },
    memberIds: { type: [ObjectId], ref: "User", default: [], index: true },
    background: { type: String, default: "#c62828" },
  },
  { timestamps: true },
);

const listSchema = new Schema<ListDoc>(
  {
    boardId: { type: ObjectId, ref: "Board", required: true },
    title: { type: String, required: true, trim: true },
    position: { type: String, required: true },
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
    labels: { type: [String], enum: LABEL_COLORS, default: [] },
    dueDate: { type: Date, default: null },
    assigneeIds: { type: [ObjectId], ref: "User", default: [] },
    position: { type: String, required: true },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
cardSchema.index({ listId: 1, position: 1 });

function model<T>(name: string, schema: Schema<T>): Model<T> {
  // Reuse compiled models across Next.js dev reloads.
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

export const UserModel = model("User", userSchema);
export const BoardModel = model("Board", boardSchema);
export const ListModel = model("List", listSchema);
export const CardModel = model("Card", cardSchema);
