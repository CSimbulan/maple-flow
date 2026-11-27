import SchemaBuilder from "@pothos/core";
import type {
  BoardDoc,
  CardDoc,
  ListDoc,
  OrganizationDoc,
  ProjectDoc,
  TagDoc,
  UserDoc,
} from "../db/models";
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
    CreateProjectPayloadRef: builder.objectRef<{
      project: ProjectDoc;
      workspace: OrganizationDoc;
    }>("CreateProjectPayload"),
    BoardRef: builder.objectRef<BoardDoc>("Board"),
    ListRef: builder.objectRef<ListDoc>("List"),
    CardRef: builder.objectRef<CardDoc>("Card"),
    TagRef: builder.objectRef<TagDoc>("Tag"),
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
