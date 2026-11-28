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
    "\n  fragment TagFields on Tag {\n    id\n    name\n    color\n  }\n": typeof types.TagFieldsFragmentDoc,
    "\n  fragment CardFields on Card {\n    id\n    title\n    description\n    tags {\n      ...TagFields\n    }\n    priority\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n": typeof types.CardFieldsFragmentDoc,
    "\n  fragment ListFields on List {\n    id\n    title\n    position\n    color\n    cards {\n      ...CardFields\n    }\n  }\n": typeof types.ListFieldsFragmentDoc,
    "\n  fragment BoardTileFields on Board {\n    id\n    title\n    background\n    updatedAt\n  }\n": typeof types.BoardTileFieldsFragmentDoc,
    "\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      createdAt\n      viewerCanManage\n      project {\n        id\n        name\n        workspace {\n          id\n          name\n        }\n      }\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      tags {\n        ...TagFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": typeof types.BoardDetailDocument,
    "\n  mutation CreateBoard($projectId: ID!, $title: String!, $background: String) {\n    createBoard(projectId: $projectId, title: $title, background: $background) {\n      ...BoardTileFields\n      project {\n        id\n        boards {\n          ...BoardTileFields\n        }\n      }\n    }\n  }\n": typeof types.CreateBoardDocument,
    "\n  mutation UpdateBoard($id: ID!, $title: String, $background: String) {\n    updateBoard(id: $id, title: $title, background: $background) {\n      id\n      title\n      background\n    }\n  }\n": typeof types.UpdateBoardDocument,
    "\n  mutation DeleteBoard($id: ID!) {\n    deleteBoard(id: $id)\n  }\n": typeof types.DeleteBoardDocument,
    "\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n    }\n  }\n": typeof types.AddBoardMemberDocument,
    "\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": typeof types.RemoveBoardMemberDocument,
    "\n  mutation CreateTag($boardId: ID!, $name: String!, $color: String!) {\n    createTag(boardId: $boardId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n": typeof types.CreateTagDocument,
    "\n  mutation UpdateTag($boardId: ID!, $tagId: ID!, $name: String, $color: String) {\n    updateTag(boardId: $boardId, tagId: $tagId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n": typeof types.UpdateTagDocument,
    "\n  mutation DeleteTag($boardId: ID!, $tagId: ID!) {\n    deleteTag(boardId: $boardId, tagId: $tagId) {\n      id\n      tags {\n        ...TagFields\n      }\n      lists {\n        id\n        cards {\n          id\n          tags {\n            ...TagFields\n          }\n        }\n      }\n    }\n  }\n": typeof types.DeleteTagDocument,
    "\n  mutation CreateList($boardId: ID!, $title: String!, $color: String) {\n    createList(boardId: $boardId, title: $title, color: $color) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": typeof types.CreateListDocument,
    "\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n": typeof types.RenameListDocument,
    "\n  mutation UpdateListColor($id: ID!, $color: String!) {\n    updateListColor(id: $id, color: $color) {\n      id\n      color\n    }\n  }\n": typeof types.UpdateListColorDocument,
    "\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n": typeof types.MoveListDocument,
    "\n  mutation SortList($id: ID!, $by: CardSort!) {\n    sortList(id: $id, by: $by) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n": typeof types.SortListDocument,
    "\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n": typeof types.ArchiveListDocument,
    "\n  mutation CreateCard(\n    $listId: ID!\n    $title: String!\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    createCard(\n      listId: $listId\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n": typeof types.CreateCardDocument,
    "\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n": typeof types.UpdateCardDocument,
    "\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n": typeof types.MoveCardDocument,
    "\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n": typeof types.ArchiveCardDocument,
    "\n  query ArchivedCards($id: ID!) {\n    board(id: $id) {\n      id\n      archivedCards {\n        ...CardFields\n        list {\n          id\n          title\n          archived\n        }\n      }\n    }\n  }\n": typeof types.ArchivedCardsDocument,
    "\n  mutation RestoreCard($id: ID!, $listId: ID) {\n    restoreCard(id: $id, listId: $listId) {\n      card {\n        ...CardFields\n      }\n      list {\n        id\n        title\n        cards {\n          ...CardFields\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n": typeof types.RestoreCardDocument,
    "\n  query ArchivedLists($id: ID!) {\n    board(id: $id) {\n      id\n      archivedLists {\n        id\n        title\n        archived\n        cards {\n          id\n        }\n      }\n    }\n  }\n": typeof types.ArchivedListsDocument,
    "\n  mutation RestoreList($id: ID!) {\n    restoreList(id: $id) {\n      list {\n        id\n        title\n        archived\n      }\n      board {\n        id\n        lists {\n          ...ListFields\n        }\n        archivedLists {\n          id\n        }\n      }\n    }\n  }\n": typeof types.RestoreListDocument,
    "\n  mutation DeleteCard($id: ID!) {\n    deleteCard(id: $id) {\n      deletedId\n      list {\n        id\n        cards {\n          id\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n": typeof types.DeleteCardDocument,
    "\n  mutation DeleteList($id: ID!) {\n    deleteList(id: $id) {\n      deletedId\n      board {\n        id\n        lists {\n          id\n        }\n        archivedLists {\n          id\n        }\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n": typeof types.DeleteListDocument,
    "\n  fragment WorkspaceSummaryFields on Workspace {\n    id\n    name\n    viewerIsOwner\n  }\n": typeof types.WorkspaceSummaryFieldsFragmentDoc,
    "\n  query Workspaces {\n    workspaces {\n      ...WorkspaceSummaryFields\n    }\n  }\n": typeof types.WorkspacesDocument,
    "\n  query Workspace($id: ID!) {\n    workspace(id: $id) {\n      ...WorkspaceSummaryFields\n      createdAt\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n": typeof types.WorkspaceDocument,
    "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      workspace {\n        ...WorkspaceSummaryFields\n      }\n      boards {\n        ...BoardTileFields\n      }\n    }\n  }\n": typeof types.ProjectDocument,
    "\n  query SharedBoards {\n    sharedBoards {\n      ...BoardTileFields\n    }\n  }\n": typeof types.SharedBoardsDocument,
    "\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      ...WorkspaceSummaryFields\n      projects {\n        id\n        name\n      }\n    }\n  }\n": typeof types.CreateWorkspaceDocument,
    "\n  mutation RenameWorkspace($id: ID!, $name: String!) {\n    renameWorkspace(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n": typeof types.RenameWorkspaceDocument,
    "\n  mutation DeleteWorkspace($id: ID!) {\n    deleteWorkspace(id: $id)\n  }\n": typeof types.DeleteWorkspaceDocument,
    "\n  mutation AddWorkspaceMember($workspaceId: ID!, $email: String!) {\n    addWorkspaceMember(workspaceId: $workspaceId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n": typeof types.AddWorkspaceMemberDocument,
    "\n  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {\n    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n": typeof types.RemoveWorkspaceMemberDocument,
    "\n  mutation CreateProject($workspaceId: ID!, $name: String!) {\n    createProject(workspaceId: $workspaceId, name: $name) {\n      project {\n        id\n        name\n      }\n      workspace {\n        id\n        projects {\n          id\n          name\n          boards {\n            id\n          }\n        }\n      }\n    }\n  }\n": typeof types.CreateProjectDocument,
    "\n  mutation RenameProject($id: ID!, $name: String!) {\n    renameProject(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n": typeof types.RenameProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id) {\n      id\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n": typeof types.DeleteProjectDocument,
    "\n  fragment CommentFields on Comment {\n    id\n    text\n    createdAt\n    editedAt\n    viewerIsAuthor\n    author {\n      ...UserFields\n    }\n  }\n": typeof types.CommentFieldsFragmentDoc,
    "\n  fragment ActivityFields on CardActivity {\n    id\n    kind\n    createdAt\n    from\n    to\n    addedTags {\n      name\n      color\n    }\n    removedTags {\n      name\n      color\n    }\n    actor {\n      ...UserFields\n    }\n    addedUsers {\n      ...UserFields\n    }\n    removedUsers {\n      ...UserFields\n    }\n  }\n": typeof types.ActivityFieldsFragmentDoc,
    "\n  query CardFeed($id: ID!) {\n    card(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n      activity {\n        ...ActivityFields\n      }\n    }\n  }\n": typeof types.CardFeedDocument,
    "\n  mutation AddComment($cardId: ID!, $text: String!) {\n    addComment(cardId: $cardId, text: $text) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n": typeof types.AddCommentDocument,
    "\n  mutation UpdateComment($id: ID!, $text: String!) {\n    updateComment(id: $id, text: $text) {\n      ...CommentFields\n    }\n  }\n": typeof types.UpdateCommentDocument,
    "\n  mutation DeleteComment($id: ID!) {\n    deleteComment(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n": typeof types.DeleteCommentDocument,
    "\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n": typeof types.MeDocument,
};
const documents: Documents = {
    "\n  fragment UserFields on User {\n    id\n    name\n    email\n    image\n  }\n": types.UserFieldsFragmentDoc,
    "\n  fragment TagFields on Tag {\n    id\n    name\n    color\n  }\n": types.TagFieldsFragmentDoc,
    "\n  fragment CardFields on Card {\n    id\n    title\n    description\n    tags {\n      ...TagFields\n    }\n    priority\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n": types.CardFieldsFragmentDoc,
    "\n  fragment ListFields on List {\n    id\n    title\n    position\n    color\n    cards {\n      ...CardFields\n    }\n  }\n": types.ListFieldsFragmentDoc,
    "\n  fragment BoardTileFields on Board {\n    id\n    title\n    background\n    updatedAt\n  }\n": types.BoardTileFieldsFragmentDoc,
    "\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      createdAt\n      viewerCanManage\n      project {\n        id\n        name\n        workspace {\n          id\n          name\n        }\n      }\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      tags {\n        ...TagFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": types.BoardDetailDocument,
    "\n  mutation CreateBoard($projectId: ID!, $title: String!, $background: String) {\n    createBoard(projectId: $projectId, title: $title, background: $background) {\n      ...BoardTileFields\n      project {\n        id\n        boards {\n          ...BoardTileFields\n        }\n      }\n    }\n  }\n": types.CreateBoardDocument,
    "\n  mutation UpdateBoard($id: ID!, $title: String, $background: String) {\n    updateBoard(id: $id, title: $title, background: $background) {\n      id\n      title\n      background\n    }\n  }\n": types.UpdateBoardDocument,
    "\n  mutation DeleteBoard($id: ID!) {\n    deleteBoard(id: $id)\n  }\n": types.DeleteBoardDocument,
    "\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n    }\n  }\n": types.AddBoardMemberDocument,
    "\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": types.RemoveBoardMemberDocument,
    "\n  mutation CreateTag($boardId: ID!, $name: String!, $color: String!) {\n    createTag(boardId: $boardId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n": types.CreateTagDocument,
    "\n  mutation UpdateTag($boardId: ID!, $tagId: ID!, $name: String, $color: String) {\n    updateTag(boardId: $boardId, tagId: $tagId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n": types.UpdateTagDocument,
    "\n  mutation DeleteTag($boardId: ID!, $tagId: ID!) {\n    deleteTag(boardId: $boardId, tagId: $tagId) {\n      id\n      tags {\n        ...TagFields\n      }\n      lists {\n        id\n        cards {\n          id\n          tags {\n            ...TagFields\n          }\n        }\n      }\n    }\n  }\n": types.DeleteTagDocument,
    "\n  mutation CreateList($boardId: ID!, $title: String!, $color: String) {\n    createList(boardId: $boardId, title: $title, color: $color) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n": types.CreateListDocument,
    "\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n": types.RenameListDocument,
    "\n  mutation UpdateListColor($id: ID!, $color: String!) {\n    updateListColor(id: $id, color: $color) {\n      id\n      color\n    }\n  }\n": types.UpdateListColorDocument,
    "\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n": types.MoveListDocument,
    "\n  mutation SortList($id: ID!, $by: CardSort!) {\n    sortList(id: $id, by: $by) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n": types.SortListDocument,
    "\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n": types.ArchiveListDocument,
    "\n  mutation CreateCard(\n    $listId: ID!\n    $title: String!\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    createCard(\n      listId: $listId\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n": types.CreateCardDocument,
    "\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n": types.UpdateCardDocument,
    "\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n": types.MoveCardDocument,
    "\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n": types.ArchiveCardDocument,
    "\n  query ArchivedCards($id: ID!) {\n    board(id: $id) {\n      id\n      archivedCards {\n        ...CardFields\n        list {\n          id\n          title\n          archived\n        }\n      }\n    }\n  }\n": types.ArchivedCardsDocument,
    "\n  mutation RestoreCard($id: ID!, $listId: ID) {\n    restoreCard(id: $id, listId: $listId) {\n      card {\n        ...CardFields\n      }\n      list {\n        id\n        title\n        cards {\n          ...CardFields\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n": types.RestoreCardDocument,
    "\n  query ArchivedLists($id: ID!) {\n    board(id: $id) {\n      id\n      archivedLists {\n        id\n        title\n        archived\n        cards {\n          id\n        }\n      }\n    }\n  }\n": types.ArchivedListsDocument,
    "\n  mutation RestoreList($id: ID!) {\n    restoreList(id: $id) {\n      list {\n        id\n        title\n        archived\n      }\n      board {\n        id\n        lists {\n          ...ListFields\n        }\n        archivedLists {\n          id\n        }\n      }\n    }\n  }\n": types.RestoreListDocument,
    "\n  mutation DeleteCard($id: ID!) {\n    deleteCard(id: $id) {\n      deletedId\n      list {\n        id\n        cards {\n          id\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n": types.DeleteCardDocument,
    "\n  mutation DeleteList($id: ID!) {\n    deleteList(id: $id) {\n      deletedId\n      board {\n        id\n        lists {\n          id\n        }\n        archivedLists {\n          id\n        }\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n": types.DeleteListDocument,
    "\n  fragment WorkspaceSummaryFields on Workspace {\n    id\n    name\n    viewerIsOwner\n  }\n": types.WorkspaceSummaryFieldsFragmentDoc,
    "\n  query Workspaces {\n    workspaces {\n      ...WorkspaceSummaryFields\n    }\n  }\n": types.WorkspacesDocument,
    "\n  query Workspace($id: ID!) {\n    workspace(id: $id) {\n      ...WorkspaceSummaryFields\n      createdAt\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n": types.WorkspaceDocument,
    "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      workspace {\n        ...WorkspaceSummaryFields\n      }\n      boards {\n        ...BoardTileFields\n      }\n    }\n  }\n": types.ProjectDocument,
    "\n  query SharedBoards {\n    sharedBoards {\n      ...BoardTileFields\n    }\n  }\n": types.SharedBoardsDocument,
    "\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      ...WorkspaceSummaryFields\n      projects {\n        id\n        name\n      }\n    }\n  }\n": types.CreateWorkspaceDocument,
    "\n  mutation RenameWorkspace($id: ID!, $name: String!) {\n    renameWorkspace(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n": types.RenameWorkspaceDocument,
    "\n  mutation DeleteWorkspace($id: ID!) {\n    deleteWorkspace(id: $id)\n  }\n": types.DeleteWorkspaceDocument,
    "\n  mutation AddWorkspaceMember($workspaceId: ID!, $email: String!) {\n    addWorkspaceMember(workspaceId: $workspaceId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n": types.AddWorkspaceMemberDocument,
    "\n  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {\n    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n": types.RemoveWorkspaceMemberDocument,
    "\n  mutation CreateProject($workspaceId: ID!, $name: String!) {\n    createProject(workspaceId: $workspaceId, name: $name) {\n      project {\n        id\n        name\n      }\n      workspace {\n        id\n        projects {\n          id\n          name\n          boards {\n            id\n          }\n        }\n      }\n    }\n  }\n": types.CreateProjectDocument,
    "\n  mutation RenameProject($id: ID!, $name: String!) {\n    renameProject(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n": types.RenameProjectDocument,
    "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id) {\n      id\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n": types.DeleteProjectDocument,
    "\n  fragment CommentFields on Comment {\n    id\n    text\n    createdAt\n    editedAt\n    viewerIsAuthor\n    author {\n      ...UserFields\n    }\n  }\n": types.CommentFieldsFragmentDoc,
    "\n  fragment ActivityFields on CardActivity {\n    id\n    kind\n    createdAt\n    from\n    to\n    addedTags {\n      name\n      color\n    }\n    removedTags {\n      name\n      color\n    }\n    actor {\n      ...UserFields\n    }\n    addedUsers {\n      ...UserFields\n    }\n    removedUsers {\n      ...UserFields\n    }\n  }\n": types.ActivityFieldsFragmentDoc,
    "\n  query CardFeed($id: ID!) {\n    card(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n      activity {\n        ...ActivityFields\n      }\n    }\n  }\n": types.CardFeedDocument,
    "\n  mutation AddComment($cardId: ID!, $text: String!) {\n    addComment(cardId: $cardId, text: $text) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n": types.AddCommentDocument,
    "\n  mutation UpdateComment($id: ID!, $text: String!) {\n    updateComment(id: $id, text: $text) {\n      ...CommentFields\n    }\n  }\n": types.UpdateCommentDocument,
    "\n  mutation DeleteComment($id: ID!) {\n    deleteComment(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n": types.DeleteCommentDocument,
    "\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n": types.MeDocument,
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
export function graphql(source: "\n  fragment TagFields on Tag {\n    id\n    name\n    color\n  }\n"): (typeof documents)["\n  fragment TagFields on Tag {\n    id\n    name\n    color\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment CardFields on Card {\n    id\n    title\n    description\n    tags {\n      ...TagFields\n    }\n    priority\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  fragment CardFields on Card {\n    id\n    title\n    description\n    tags {\n      ...TagFields\n    }\n    priority\n    dueDate\n    position\n    listId\n    assignees {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ListFields on List {\n    id\n    title\n    position\n    color\n    cards {\n      ...CardFields\n    }\n  }\n"): (typeof documents)["\n  fragment ListFields on List {\n    id\n    title\n    position\n    color\n    cards {\n      ...CardFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BoardTileFields on Board {\n    id\n    title\n    background\n    updatedAt\n  }\n"): (typeof documents)["\n  fragment BoardTileFields on Board {\n    id\n    title\n    background\n    updatedAt\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      createdAt\n      viewerCanManage\n      project {\n        id\n        name\n        workspace {\n          id\n          name\n        }\n      }\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      tags {\n        ...TagFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query BoardDetail($id: ID!) {\n    board(id: $id) {\n      id\n      title\n      background\n      createdAt\n      viewerCanManage\n      project {\n        id\n        name\n        workspace {\n          id\n          name\n        }\n      }\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      tags {\n        ...TagFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateBoard($projectId: ID!, $title: String!, $background: String) {\n    createBoard(projectId: $projectId, title: $title, background: $background) {\n      ...BoardTileFields\n      project {\n        id\n        boards {\n          ...BoardTileFields\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateBoard($projectId: ID!, $title: String!, $background: String) {\n    createBoard(projectId: $projectId, title: $title, background: $background) {\n      ...BoardTileFields\n      project {\n        id\n        boards {\n          ...BoardTileFields\n        }\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddBoardMember($boardId: ID!, $email: String!) {\n    addBoardMember(boardId: $boardId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {\n    removeBoardMember(boardId: $boardId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      guests {\n        ...UserFields\n      }\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateTag($boardId: ID!, $name: String!, $color: String!) {\n    createTag(boardId: $boardId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateTag($boardId: ID!, $name: String!, $color: String!) {\n    createTag(boardId: $boardId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateTag($boardId: ID!, $tagId: ID!, $name: String, $color: String) {\n    updateTag(boardId: $boardId, tagId: $tagId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateTag($boardId: ID!, $tagId: ID!, $name: String, $color: String) {\n    updateTag(boardId: $boardId, tagId: $tagId, name: $name, color: $color) {\n      id\n      tags {\n        ...TagFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTag($boardId: ID!, $tagId: ID!) {\n    deleteTag(boardId: $boardId, tagId: $tagId) {\n      id\n      tags {\n        ...TagFields\n      }\n      lists {\n        id\n        cards {\n          id\n          tags {\n            ...TagFields\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteTag($boardId: ID!, $tagId: ID!) {\n    deleteTag(boardId: $boardId, tagId: $tagId) {\n      id\n      tags {\n        ...TagFields\n      }\n      lists {\n        id\n        cards {\n          id\n          tags {\n            ...TagFields\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateList($boardId: ID!, $title: String!, $color: String) {\n    createList(boardId: $boardId, title: $title, color: $color) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateList($boardId: ID!, $title: String!, $color: String) {\n    createList(boardId: $boardId, title: $title, color: $color) {\n      id\n      lists {\n        ...ListFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n"): (typeof documents)["\n  mutation RenameList($id: ID!, $title: String!) {\n    renameList(id: $id, title: $title) {\n      id\n      title\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateListColor($id: ID!, $color: String!) {\n    updateListColor(id: $id, color: $color) {\n      id\n      color\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateListColor($id: ID!, $color: String!) {\n    updateListColor(id: $id, color: $color) {\n      id\n      color\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {\n    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {\n      id\n      lists {\n        id\n        position\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SortList($id: ID!, $by: CardSort!) {\n    sortList(id: $id, by: $by) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SortList($id: ID!, $by: CardSort!) {\n    sortList(id: $id, by: $by) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveList($id: ID!) {\n    archiveList(id: $id) {\n      id\n      lists {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateCard(\n    $listId: ID!\n    $title: String!\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    createCard(\n      listId: $listId\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateCard(\n    $listId: ID!\n    $title: String!\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    createCard(\n      listId: $listId\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      id\n      cards {\n        ...CardFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateCard(\n    $id: ID!\n    $title: String\n    $description: String\n    $tagIds: [ID!]\n    $dueDate: String\n    $priority: Priority\n    $assigneeIds: [ID!]\n  ) {\n    updateCard(\n      id: $id\n      title: $title\n      description: $description\n      tagIds: $tagIds\n      dueDate: $dueDate\n      priority: $priority\n      assigneeIds: $assigneeIds\n    ) {\n      ...CardFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {\n    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {\n      card {\n        ...CardFields\n      }\n      fromList {\n        id\n        cards {\n          id\n          position\n        }\n      }\n      toList {\n        id\n        cards {\n          ...CardFields\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ArchiveCard($id: ID!) {\n    archiveCard(id: $id) {\n      id\n      cards {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ArchivedCards($id: ID!) {\n    board(id: $id) {\n      id\n      archivedCards {\n        ...CardFields\n        list {\n          id\n          title\n          archived\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ArchivedCards($id: ID!) {\n    board(id: $id) {\n      id\n      archivedCards {\n        ...CardFields\n        list {\n          id\n          title\n          archived\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RestoreCard($id: ID!, $listId: ID) {\n    restoreCard(id: $id, listId: $listId) {\n      card {\n        ...CardFields\n      }\n      list {\n        id\n        title\n        cards {\n          ...CardFields\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RestoreCard($id: ID!, $listId: ID) {\n    restoreCard(id: $id, listId: $listId) {\n      card {\n        ...CardFields\n      }\n      list {\n        id\n        title\n        cards {\n          ...CardFields\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ArchivedLists($id: ID!) {\n    board(id: $id) {\n      id\n      archivedLists {\n        id\n        title\n        archived\n        cards {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ArchivedLists($id: ID!) {\n    board(id: $id) {\n      id\n      archivedLists {\n        id\n        title\n        archived\n        cards {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RestoreList($id: ID!) {\n    restoreList(id: $id) {\n      list {\n        id\n        title\n        archived\n      }\n      board {\n        id\n        lists {\n          ...ListFields\n        }\n        archivedLists {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RestoreList($id: ID!) {\n    restoreList(id: $id) {\n      list {\n        id\n        title\n        archived\n      }\n      board {\n        id\n        lists {\n          ...ListFields\n        }\n        archivedLists {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteCard($id: ID!) {\n    deleteCard(id: $id) {\n      deletedId\n      list {\n        id\n        cards {\n          id\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteCard($id: ID!) {\n    deleteCard(id: $id) {\n      deletedId\n      list {\n        id\n        cards {\n          id\n        }\n      }\n      board {\n        id\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteList($id: ID!) {\n    deleteList(id: $id) {\n      deletedId\n      board {\n        id\n        lists {\n          id\n        }\n        archivedLists {\n          id\n        }\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteList($id: ID!) {\n    deleteList(id: $id) {\n      deletedId\n      board {\n        id\n        lists {\n          id\n        }\n        archivedLists {\n          id\n        }\n        archivedCards {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment WorkspaceSummaryFields on Workspace {\n    id\n    name\n    viewerIsOwner\n  }\n"): (typeof documents)["\n  fragment WorkspaceSummaryFields on Workspace {\n    id\n    name\n    viewerIsOwner\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Workspaces {\n    workspaces {\n      ...WorkspaceSummaryFields\n    }\n  }\n"): (typeof documents)["\n  query Workspaces {\n    workspaces {\n      ...WorkspaceSummaryFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Workspace($id: ID!) {\n    workspace(id: $id) {\n      ...WorkspaceSummaryFields\n      createdAt\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Workspace($id: ID!) {\n    workspace(id: $id) {\n      ...WorkspaceSummaryFields\n      createdAt\n      owner {\n        ...UserFields\n      }\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      workspace {\n        ...WorkspaceSummaryFields\n      }\n      boards {\n        ...BoardTileFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query Project($id: ID!) {\n    project(id: $id) {\n      id\n      name\n      createdAt\n      workspace {\n        ...WorkspaceSummaryFields\n      }\n      boards {\n        ...BoardTileFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SharedBoards {\n    sharedBoards {\n      ...BoardTileFields\n    }\n  }\n"): (typeof documents)["\n  query SharedBoards {\n    sharedBoards {\n      ...BoardTileFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      ...WorkspaceSummaryFields\n      projects {\n        id\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateWorkspace($name: String!) {\n    createWorkspace(name: $name) {\n      ...WorkspaceSummaryFields\n      projects {\n        id\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RenameWorkspace($id: ID!, $name: String!) {\n    renameWorkspace(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation RenameWorkspace($id: ID!, $name: String!) {\n    renameWorkspace(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteWorkspace($id: ID!) {\n    deleteWorkspace(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteWorkspace($id: ID!) {\n    deleteWorkspace(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddWorkspaceMember($workspaceId: ID!, $email: String!) {\n    addWorkspaceMember(workspaceId: $workspaceId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddWorkspaceMember($workspaceId: ID!, $email: String!) {\n    addWorkspaceMember(workspaceId: $workspaceId, email: $email) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {\n    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {\n    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId) {\n      id\n      members {\n        ...UserFields\n      }\n      memberships {\n        joinedAt\n        user {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateProject($workspaceId: ID!, $name: String!) {\n    createProject(workspaceId: $workspaceId, name: $name) {\n      project {\n        id\n        name\n      }\n      workspace {\n        id\n        projects {\n          id\n          name\n          boards {\n            id\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateProject($workspaceId: ID!, $name: String!) {\n    createProject(workspaceId: $workspaceId, name: $name) {\n      project {\n        id\n        name\n      }\n      workspace {\n        id\n        projects {\n          id\n          name\n          boards {\n            id\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RenameProject($id: ID!, $name: String!) {\n    renameProject(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation RenameProject($id: ID!, $name: String!) {\n    renameProject(id: $id, name: $name) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id) {\n      id\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteProject($id: ID!) {\n    deleteProject(id: $id) {\n      id\n      projects {\n        id\n        name\n        boards {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment CommentFields on Comment {\n    id\n    text\n    createdAt\n    editedAt\n    viewerIsAuthor\n    author {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  fragment CommentFields on Comment {\n    id\n    text\n    createdAt\n    editedAt\n    viewerIsAuthor\n    author {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ActivityFields on CardActivity {\n    id\n    kind\n    createdAt\n    from\n    to\n    addedTags {\n      name\n      color\n    }\n    removedTags {\n      name\n      color\n    }\n    actor {\n      ...UserFields\n    }\n    addedUsers {\n      ...UserFields\n    }\n    removedUsers {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  fragment ActivityFields on CardActivity {\n    id\n    kind\n    createdAt\n    from\n    to\n    addedTags {\n      name\n      color\n    }\n    removedTags {\n      name\n      color\n    }\n    actor {\n      ...UserFields\n    }\n    addedUsers {\n      ...UserFields\n    }\n    removedUsers {\n      ...UserFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CardFeed($id: ID!) {\n    card(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n      activity {\n        ...ActivityFields\n      }\n    }\n  }\n"): (typeof documents)["\n  query CardFeed($id: ID!) {\n    card(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n      activity {\n        ...ActivityFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddComment($cardId: ID!, $text: String!) {\n    addComment(cardId: $cardId, text: $text) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation AddComment($cardId: ID!, $text: String!) {\n    addComment(cardId: $cardId, text: $text) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateComment($id: ID!, $text: String!) {\n    updateComment(id: $id, text: $text) {\n      ...CommentFields\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateComment($id: ID!, $text: String!) {\n    updateComment(id: $id, text: $text) {\n      ...CommentFields\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteComment($id: ID!) {\n    deleteComment(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteComment($id: ID!) {\n    deleteComment(id: $id) {\n      id\n      comments {\n        ...CommentFields\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n"): (typeof documents)["\n  query Me {\n    me {\n      ...UserFields\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;