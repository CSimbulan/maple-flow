import { graphql } from "@/gql";

export const UserFields = graphql(`
  fragment UserFields on User {
    id
    name
    email
    image
  }
`);

export const TagFields = graphql(`
  fragment TagFields on Tag {
    id
    name
    color
  }
`);

export const CardFields = graphql(`
  fragment CardFields on Card {
    id
    title
    description
    tags {
      ...TagFields
    }
    priority
    dueDate
    position
    listId
    assignees {
      ...UserFields
    }
  }
`);

export const ListFields = graphql(`
  fragment ListFields on List {
    id
    title
    position
    color
    cards {
      ...CardFields
    }
  }
`);

export const BoardTileFields = graphql(`
  fragment BoardTileFields on Board {
    id
    title
    background
    updatedAt
  }
`);

export const BoardDetailQuery = graphql(`
  query BoardDetail($id: ID!) {
    board(id: $id) {
      id
      title
      background
      viewerCanManage
      project {
        id
        name
        workspace {
          id
          name
        }
      }
      owner {
        ...UserFields
      }
      members {
        ...UserFields
      }
      guests {
        ...UserFields
      }
      tags {
        ...TagFields
      }
      lists {
        ...ListFields
      }
    }
  }
`);

export const CreateBoardMutation = graphql(`
  mutation CreateBoard($projectId: ID!, $title: String!, $background: String) {
    createBoard(projectId: $projectId, title: $title, background: $background) {
      ...BoardTileFields
      project {
        id
        boards {
          ...BoardTileFields
        }
      }
    }
  }
`);

export const UpdateBoardMutation = graphql(`
  mutation UpdateBoard($id: ID!, $title: String, $background: String) {
    updateBoard(id: $id, title: $title, background: $background) {
      id
      title
      background
    }
  }
`);

export const DeleteBoardMutation = graphql(`
  mutation DeleteBoard($id: ID!) {
    deleteBoard(id: $id)
  }
`);

export const AddBoardMemberMutation = graphql(`
  mutation AddBoardMember($boardId: ID!, $email: String!) {
    addBoardMember(boardId: $boardId, email: $email) {
      id
      members {
        ...UserFields
      }
      guests {
        ...UserFields
      }
    }
  }
`);

export const RemoveBoardMemberMutation = graphql(`
  mutation RemoveBoardMember($boardId: ID!, $userId: ID!) {
    removeBoardMember(boardId: $boardId, userId: $userId) {
      id
      members {
        ...UserFields
      }
      guests {
        ...UserFields
      }
      lists {
        ...ListFields
      }
    }
  }
`);

export const CreateTagMutation = graphql(`
  mutation CreateTag($boardId: ID!, $name: String!, $color: String!) {
    createTag(boardId: $boardId, name: $name, color: $color) {
      id
      tags {
        ...TagFields
      }
    }
  }
`);

export const UpdateTagMutation = graphql(`
  mutation UpdateTag($boardId: ID!, $tagId: ID!, $name: String, $color: String) {
    updateTag(boardId: $boardId, tagId: $tagId, name: $name, color: $color) {
      id
      tags {
        ...TagFields
      }
    }
  }
`);

// Cards that had the tag lose it, so their tags come back too.
export const DeleteTagMutation = graphql(`
  mutation DeleteTag($boardId: ID!, $tagId: ID!) {
    deleteTag(boardId: $boardId, tagId: $tagId) {
      id
      tags {
        ...TagFields
      }
      lists {
        id
        cards {
          id
          tags {
            ...TagFields
          }
        }
      }
    }
  }
`);

export const CreateListMutation = graphql(`
  mutation CreateList($boardId: ID!, $title: String!, $color: String) {
    createList(boardId: $boardId, title: $title, color: $color) {
      id
      lists {
        ...ListFields
      }
    }
  }
`);

export const RenameListMutation = graphql(`
  mutation RenameList($id: ID!, $title: String!) {
    renameList(id: $id, title: $title) {
      id
      title
    }
  }
`);

export const UpdateListColorMutation = graphql(`
  mutation UpdateListColor($id: ID!, $color: String!) {
    updateListColor(id: $id, color: $color) {
      id
      color
    }
  }
`);

export const MoveListMutation = graphql(`
  mutation MoveList($id: ID!, $beforeId: ID, $afterId: ID) {
    moveList(id: $id, beforeId: $beforeId, afterId: $afterId) {
      id
      lists {
        id
        position
      }
    }
  }
`);

export const SortListMutation = graphql(`
  mutation SortList($id: ID!, $by: CardSort!) {
    sortList(id: $id, by: $by) {
      id
      cards {
        ...CardFields
      }
    }
  }
`);

export const ArchiveListMutation = graphql(`
  mutation ArchiveList($id: ID!) {
    archiveList(id: $id) {
      id
      lists {
        id
      }
    }
  }
`);

export const CreateCardMutation = graphql(`
  mutation CreateCard(
    $listId: ID!
    $title: String!
    $description: String
    $tagIds: [ID!]
    $dueDate: String
    $priority: Priority
    $assigneeIds: [ID!]
  ) {
    createCard(
      listId: $listId
      title: $title
      description: $description
      tagIds: $tagIds
      dueDate: $dueDate
      priority: $priority
      assigneeIds: $assigneeIds
    ) {
      id
      cards {
        ...CardFields
      }
    }
  }
`);

export const UpdateCardMutation = graphql(`
  mutation UpdateCard(
    $id: ID!
    $title: String
    $description: String
    $tagIds: [ID!]
    $dueDate: String
    $priority: Priority
    $assigneeIds: [ID!]
  ) {
    updateCard(
      id: $id
      title: $title
      description: $description
      tagIds: $tagIds
      dueDate: $dueDate
      priority: $priority
      assigneeIds: $assigneeIds
    ) {
      ...CardFields
    }
  }
`);

export const MoveCardMutation = graphql(`
  mutation MoveCard($id: ID!, $toListId: ID!, $beforeId: ID, $afterId: ID) {
    moveCard(id: $id, toListId: $toListId, beforeId: $beforeId, afterId: $afterId) {
      card {
        ...CardFields
      }
      fromList {
        id
        cards {
          id
          position
        }
      }
      toList {
        id
        cards {
          ...CardFields
        }
      }
    }
  }
`);

export const ArchiveCardMutation = graphql(`
  mutation ArchiveCard($id: ID!) {
    archiveCard(id: $id) {
      id
      cards {
        id
      }
    }
  }
`);

export const ArchivedCardsQuery = graphql(`
  query ArchivedCards($id: ID!) {
    board(id: $id) {
      id
      archivedCards {
        ...CardFields
        list {
          id
          title
          archived
        }
      }
    }
  }
`);

export const RestoreCardMutation = graphql(`
  mutation RestoreCard($id: ID!, $listId: ID) {
    restoreCard(id: $id, listId: $listId) {
      card {
        ...CardFields
      }
      list {
        id
        title
        cards {
          ...CardFields
        }
      }
      board {
        id
        archivedCards {
          id
        }
      }
    }
  }
`);

export const ArchivedListsQuery = graphql(`
  query ArchivedLists($id: ID!) {
    board(id: $id) {
      id
      archivedLists {
        id
        title
        archived
        cards {
          id
        }
      }
    }
  }
`);

export const RestoreListMutation = graphql(`
  mutation RestoreList($id: ID!) {
    restoreList(id: $id) {
      list {
        id
        title
        archived
      }
      board {
        id
        lists {
          ...ListFields
        }
        archivedLists {
          id
        }
      }
    }
  }
`);

export const DeleteCardMutation = graphql(`
  mutation DeleteCard($id: ID!) {
    deleteCard(id: $id) {
      deletedId
      list {
        id
        cards {
          id
        }
      }
      board {
        id
        archivedCards {
          id
        }
      }
    }
  }
`);

export const DeleteListMutation = graphql(`
  mutation DeleteList($id: ID!) {
    deleteList(id: $id) {
      deletedId
      board {
        id
        lists {
          id
        }
        archivedLists {
          id
        }
        archivedCards {
          id
        }
      }
    }
  }
`);

// ---- Workspaces and projects ----

export const WorkspaceSummaryFields = graphql(`
  fragment WorkspaceSummaryFields on Workspace {
    id
    name
    viewerIsOwner
  }
`);

export const WorkspacesQuery = graphql(`
  query Workspaces {
    workspaces {
      ...WorkspaceSummaryFields
    }
  }
`);

export const WorkspaceQuery = graphql(`
  query Workspace($id: ID!) {
    workspace(id: $id) {
      ...WorkspaceSummaryFields
      owner {
        ...UserFields
      }
      members {
        ...UserFields
      }
      projects {
        id
        name
        boards {
          id
        }
      }
    }
  }
`);

export const ProjectQuery = graphql(`
  query Project($id: ID!) {
    project(id: $id) {
      id
      name
      workspace {
        ...WorkspaceSummaryFields
      }
      boards {
        ...BoardTileFields
      }
    }
  }
`);

export const SharedBoardsQuery = graphql(`
  query SharedBoards {
    sharedBoards {
      ...BoardTileFields
    }
  }
`);

export const CreateWorkspaceMutation = graphql(`
  mutation CreateWorkspace($name: String!) {
    createWorkspace(name: $name) {
      ...WorkspaceSummaryFields
      projects {
        id
        name
      }
    }
  }
`);

export const RenameWorkspaceMutation = graphql(`
  mutation RenameWorkspace($id: ID!, $name: String!) {
    renameWorkspace(id: $id, name: $name) {
      id
      name
    }
  }
`);

export const DeleteWorkspaceMutation = graphql(`
  mutation DeleteWorkspace($id: ID!) {
    deleteWorkspace(id: $id)
  }
`);

export const AddWorkspaceMemberMutation = graphql(`
  mutation AddWorkspaceMember($workspaceId: ID!, $email: String!) {
    addWorkspaceMember(workspaceId: $workspaceId, email: $email) {
      id
      members {
        ...UserFields
      }
    }
  }
`);

export const RemoveWorkspaceMemberMutation = graphql(`
  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {
    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId) {
      id
      members {
        ...UserFields
      }
    }
  }
`);

export const CreateProjectMutation = graphql(`
  mutation CreateProject($workspaceId: ID!, $name: String!) {
    createProject(workspaceId: $workspaceId, name: $name) {
      project {
        id
        name
      }
      workspace {
        id
        projects {
          id
          name
          boards {
            id
          }
        }
      }
    }
  }
`);

export const RenameProjectMutation = graphql(`
  mutation RenameProject($id: ID!, $name: String!) {
    renameProject(id: $id, name: $name) {
      id
      name
    }
  }
`);

export const DeleteProjectMutation = graphql(`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      id
      projects {
        id
        name
        boards {
          id
        }
      }
    }
  }
`);

// ---- Comments and activity ----

export const CommentFields = graphql(`
  fragment CommentFields on Comment {
    id
    text
    createdAt
    editedAt
    viewerIsAuthor
    author {
      ...UserFields
    }
  }
`);

export const ActivityFields = graphql(`
  fragment ActivityFields on CardActivity {
    id
    kind
    createdAt
    from
    to
    addedTags {
      name
      color
    }
    removedTags {
      name
      color
    }
    actor {
      ...UserFields
    }
    addedUsers {
      ...UserFields
    }
    removedUsers {
      ...UserFields
    }
  }
`);

export const CardFeedQuery = graphql(`
  query CardFeed($id: ID!) {
    card(id: $id) {
      id
      comments {
        ...CommentFields
      }
      activity {
        ...ActivityFields
      }
    }
  }
`);

export const AddCommentMutation = graphql(`
  mutation AddComment($cardId: ID!, $text: String!) {
    addComment(cardId: $cardId, text: $text) {
      id
      comments {
        ...CommentFields
      }
    }
  }
`);

export const UpdateCommentMutation = graphql(`
  mutation UpdateComment($id: ID!, $text: String!) {
    updateComment(id: $id, text: $text) {
      ...CommentFields
    }
  }
`);

export const DeleteCommentMutation = graphql(`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id) {
      id
      comments {
        ...CommentFields
      }
    }
  }
`);

export const MeQuery = graphql(`
  query Me {
    me {
      ...UserFields
    }
  }
`);
