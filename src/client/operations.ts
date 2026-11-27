import { graphql } from "@/gql";

export const UserFields = graphql(`
  fragment UserFields on User {
    id
    name
    email
    image
  }
`);

export const CardFields = graphql(`
  fragment CardFields on Card {
    id
    title
    description
    labels
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
    cards {
      ...CardFields
    }
  }
`);

export const BoardsQuery = graphql(`
  query Boards {
    boards {
      id
      title
      background
      updatedAt
    }
  }
`);

export const BoardDetailQuery = graphql(`
  query BoardDetail($id: ID!) {
    board(id: $id) {
      id
      title
      background
      viewerIsOwner
      owner {
        ...UserFields
      }
      members {
        ...UserFields
      }
      lists {
        ...ListFields
      }
    }
  }
`);

export const CreateBoardMutation = graphql(`
  mutation CreateBoard($title: String!, $background: String) {
    createBoard(title: $title, background: $background) {
      id
      title
      background
      updatedAt
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
      lists {
        ...ListFields
      }
    }
  }
`);

export const CreateListMutation = graphql(`
  mutation CreateList($boardId: ID!, $title: String!) {
    createList(boardId: $boardId, title: $title) {
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
  mutation CreateCard($listId: ID!, $title: String!) {
    createCard(listId: $listId, title: $title) {
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
    $labels: [String!]
    $dueDate: String
    $assigneeIds: [ID!]
  ) {
    updateCard(
      id: $id
      title: $title
      description: $description
      labels: $labels
      dueDate: $dueDate
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
