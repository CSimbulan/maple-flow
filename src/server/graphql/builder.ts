import SchemaBuilder from "@pothos/core";
import {
  ACTIVITY_KINDS,
  type ActivityDoc,
  type BoardDoc,
  type CardDoc,
  type CommentDoc,
  type ListDoc,
  type OrganizationDoc,
  type ProjectDoc,
  type TagDoc,
  type UserDoc,
} from "../db/models";
import { CARD_SORTS } from "../../lib/card-sort";
import { PRIORITIES } from "../../lib/priority";
import { START_PAGES } from "../../lib/start-page";
import type { Context } from "./context";

/**
 * A fresh Pothos builder and object refs. The schema is built from a new builder each time its
 * module loads: a builder kept at module level survives Next.js hot reloads while schema.ts is
 * re-run, and registering the same fields twice throws ("Duplicate field me on Query").
 */
export function createBuilder() {
  const builder = new SchemaBuilder<{
    Context: Context;
    DefaultFieldNullability: false;
    Scalars: { ID: { Input: string; Output: string } };
  }>({ defaultFieldNullability: false });

  return {
    builder,
    UserRef: builder.objectRef<UserDoc>("User"),
    // Stored as "organizations" in MongoDB (OrganizationDoc); called Workspace in the API.
    WorkspaceRef: builder.objectRef<OrganizationDoc>("Workspace"),
    ProjectRef: builder.objectRef<ProjectDoc>("Project"),
    WorkspaceMemberRef: builder.objectRef<{ user: UserDoc; joinedAt: Date }>("WorkspaceMember"),
    CreateProjectPayloadRef: builder.objectRef<{
      project: ProjectDoc;
      workspace: OrganizationDoc;
    }>("CreateProjectPayload"),
    BoardRef: builder.objectRef<BoardDoc>("Board"),
    ListRef: builder.objectRef<ListDoc>("List"),
    CardRef: builder.objectRef<CardDoc>("Card"),
    TagRef: builder.objectRef<TagDoc>("Tag"),
    PriorityEnum: builder.enumType("Priority", {
      description: "How urgent a card is, from HIGHEST to LOWEST.",
      values: PRIORITIES,
    }),
    StartPageEnum: builder.enumType("StartPage", {
      description: "Where someone lands after signing in.",
      values: START_PAGES,
    }),
    CardSortEnum: builder.enumType("CardSort", {
      description: "How sortList orders a list's cards.",
      values: CARD_SORTS,
    }),
    CommentRef: builder.objectRef<CommentDoc>("Comment"),
    ActivityRef: builder.objectRef<ActivityDoc>("CardActivity"),
    ActivityTagRef: builder.objectRef<{ name: string; color: string }>("ActivityTag"),
    ActivityKindEnum: builder.enumType("ActivityKind", {
      description: "What happened to a card in a CardActivity entry.",
      values: ACTIVITY_KINDS,
    }),
    ActivityDayRef: builder.objectRef<{ date: string; count: number }>("ActivityDay"),
    MoveCardsPayloadRef: builder.objectRef<{ fromList: ListDoc; toList: ListDoc; moved: number }>(
      "MoveCardsPayload",
    ),
    MoveCardPayloadRef: builder.objectRef<{
      card: CardDoc;
      fromList: ListDoc;
      toList: ListDoc;
    }>("MoveCardPayload"),
    RestoreCardPayloadRef: builder.objectRef<{
      card: CardDoc;
      list: ListDoc;
      board: BoardDoc;
    }>("RestoreCardPayload"),
    RestoreListPayloadRef: builder.objectRef<{ list: ListDoc; board: BoardDoc }>(
      "RestoreListPayload",
    ),
    DeleteCardPayloadRef: builder.objectRef<{ deletedId: string; list: ListDoc; board: BoardDoc }>(
      "DeleteCardPayload",
    ),
    DeleteListPayloadRef: builder.objectRef<{ deletedId: string; board: BoardDoc }>(
      "DeleteListPayload",
    ),
  };
}

export type SchemaParts = ReturnType<typeof createBuilder>;
