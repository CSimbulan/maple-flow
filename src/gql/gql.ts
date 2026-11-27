/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  fragment UserFields on User {\n    id\n    name\n    email\n    image\n  }\n": typeof types.UserFieldsFragmentDoc,
    "\n  fragment CardFields on Card {\n    id\n    title\n    description\n    labels\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n": typeof types.CardFieldsFragmentDoc,
    "\n  fragment ListFields on List {\n    id\n    title\n    position\n    cards {\n      ...CardFields\n    }\n  }\n": typeof types.ListFieldsFragmentDoc,
    "\n  query Boards {\n    boards {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n": typeof types.BoardsDocument,
    "\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      viewerIsOwner\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": typeof types.BoardDetailDocument,
    "\n  mutation CreateBoard($title: String!, $background: String) {\n    createBoard(title: $title, background: $background) {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n": typeof types.CreateBoardDocument,
    "\n  mutation UpdateBoard($id: ID!, $title: String, $background: String) {\n    updateBoard(id: $id, title: $title, background: $background) {\n      id\n      title\n      background\n    }\n  }\n": typeof types.UpdateBoardDocument,
    "\n  mutation DeleteBoard($id: ID!) {\n    deleteBoard(id: $id)\n  }\n": typeof types.DeleteBoardDocument,
    "\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n    }\n  }\n": typeof types.AddBoardMemberDocument,
    "\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": typeof types.RemoveBoardMemberDocument,
    "\n  mutation CreateList($boardId: ID!, $title: String!) {\n    createList(boardId: $boardId, title: $title) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": typeof types.CreateListDocument,
    "\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n": typeof types.RenameListDocument,
    "\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n": typeof types.MoveListDocument,
    "\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n": typeof types.ArchiveListDocument,
    "\n  mutation CreateCard($listId: ID!, $title: String!) {\n    createCard(listId: $listId, title: $title) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n": typeof types.CreateCardDocument,
    "\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $labels: [String!]\n    $dueDate: String\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      labels: $labels\n      dueDate: $dueDate\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n": typeof types.UpdateCardDocument,
    "\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n": typeof types.MoveCardDocument,
    "\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n": typeof types.ArchiveCardDocument,
};
const documents: Documents = {
    "\n  fragment UserFields on User {\n    id\n    name\n    email\n    image\n  }\n": types.UserFieldsFragmentDoc,
    "\n  fragment CardFields on Card {\n    id\n    title\n    description\n    labels\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n": types.CardFieldsFragmentDoc,
    "\n  fragment ListFields on List {\n    id\n    title\n    position\n    cards {\n      ...CardFields\n    }\n  }\n": types.ListFieldsFragmentDoc,
    "\n  query Boards {\n    boards {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n": types.BoardsDocument,
    "\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      viewerIsOwner\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": types.BoardDetailDocument,
    "\n  mutation CreateBoard($title: String!, $background: String) {\n    createBoard(title: $title, background: $background) {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n": types.CreateBoardDocument,
    "\n  mutation UpdateBoard($id: ID!, $title: String, $background: String) {\n    updateBoard(id: $id, title: $title, background: $background) {\n      id\n      title\n      background\n    }\n  }\n": types.UpdateBoardDocument,
    "\n  mutation DeleteBoard($id: ID!) {\n    deleteBoard(id: $id)\n  }\n": types.DeleteBoardDocument,
    "\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n    }\n  }\n": types.AddBoardMemberDocument,
    "\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": types.RemoveBoardMemberDocument,
    "\n  mutation CreateList($boardId: ID!, $title: String!) {\n    createList(boardId: $boardId, title: $title) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": types.CreateListDocument,
    "\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n": types.RenameListDocument,
    "\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n": types.MoveListDocument,
    "\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n": types.ArchiveListDocument,
    "\n  mutation CreateCard($listId: ID!, $title: String!) {\n    createCard(listId: $listId, title: $title) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n": types.CreateCardDocument,
    "\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $labels: [String!]\n    $dueDate: String\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      labels: $labels\n      dueDate: $dueDate\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n": types.UpdateCardDocument,
    "\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n": types.MoveCardDocument,
    "\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n": types.ArchiveCardDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment UserFields on User {\n    id\n    name\n    email\n    image\n  }\n"): (typeof documents)["\n  fragment UserFields on User {\n    id\n    name\n    email\n    image\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment CardFields on Card {\n    id\n    title\n    description\n    labels\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  fragment CardFields on Card {\n    id\n    title\n    description\n    labels\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListFields on List {\n    id\n    title\n    position\n    cards {\n      ...CardFields\n    }\n  }\n"): (typeof documents)["\n  fragment ListFields on List {\n    id\n    title\n    position\n    cards {\n      ...CardFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Boards {\n    boards {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  query Boards {\n    boards {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      viewerIsOwner\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      viewerIsOwner\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateBoard($title: String!, $background: String) {\n    createBoard(title: $title, background: $background) {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n"): (typeof documents)["\n  mutation CreateBoard($title: String!, $background: String) {\n    createBoard(title: $title, background: $background) {\n      id\n      title\n      background\n      updatedAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateBoard($id: ID!, $title: String, $background: String) {\n    updateBoard(id: $id, title: $title, background: $background) {\n      id\n      title\n      background\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateBoard($id: ID!, $title: String, $background: String) {\n    updateBoard(id: $id, title: $title, background: $background) {\n      id\n      title\n      background\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteBoard($id: ID!) {\n    deleteBoard(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteBoard($id: ID!) {\n    deleteBoard(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateList($boardId: ID!, $title: String!) {\n    createList(boardId: $boardId, title: $title) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateList($boardId: ID!, $title: String!) {\n    createList(boardId: $boardId, title: $title) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n"): (typeof documents)["\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCard($listId: ID!, $title: String!) {\n    createCard(listId: $listId, title: $title) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCard($listId: ID!, $title: String!) {\n    createCard(listId: $listId, title: $title) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $labels: [String!]\n    $dueDate: String\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      labels: $labels\n      dueDate: $dueDate\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $labels: [String!]\n    $dueDate: String\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      labels: $labels\n      dueDate: $dueDate\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;