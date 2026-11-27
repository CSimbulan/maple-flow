import SchemaBuilder from "@pothos/core";
import type { BoardDoc, CardDoc, ListDoc, UserDoc } from "../db/models";
import type { Context } from "./context";

export const builder = new SchemaBuilder<{
  Context: Context;
  DefaultFieldNullability: false;
  Scalars: { ID: { Input: string; Output: string } };
}>({ defaultFieldNullability: false });

export const UserRef = builder.objectRef<UserDoc>("User");
export const BoardRef = builder.objectRef<BoardDoc>("Board");
export const ListRef = builder.objectRef<ListDoc>("List");
export const CardRef = builder.objectRef<CardDoc>("Card");
export const MoveCardPayloadRef = builder.objectRef<{
  card: CardDoc;
  fromList: ListDoc;
  toList: ListDoc;
}>("MoveCardPayload");
