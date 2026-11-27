"use client";

import { useMutation } from "@apollo/client/react";
import { errorMessage, useNotify } from "./notify";
import { DeleteCardMutation, DeleteListMutation } from "./operations";

/**
 * Permanently delete a card or list. The mutation responses update every array that pointed at
 * the item; the item itself is then evicted from the cache. Resolves to true on success.
 */
export function useDeleteCard() {
  const notify = useNotify();
  const [mutate, { loading }] = useMutation(DeleteCardMutation, {
    update(cache, { data }) {
      if (!data) return;
      cache.evict({ id: cache.identify({ __typename: "Card", id: data.deleteCard.deletedId }) });
      cache.gc();
    },
  });
  async function deleteCard(id: string, title: string) {
    try {
      await mutate({ variables: { id } });
      notify(`Deleted “${title}”`, "success");
      return true;
    } catch (err) {
      notify(errorMessage(err));
      return false;
    }
  }
  return [deleteCard, loading] as const;
}

export function useDeleteList() {
  const notify = useNotify();
  const [mutate, { loading }] = useMutation(DeleteListMutation, {
    update(cache, { data }) {
      if (!data) return;
      cache.evict({ id: cache.identify({ __typename: "List", id: data.deleteList.deletedId }) });
      cache.gc();
    },
  });
  async function deleteList(id: string, title: string) {
    try {
      await mutate({ variables: { id } });
      notify(`Deleted list “${title}”`, "success");
      return true;
    } catch (err) {
      notify(errorMessage(err));
      return false;
    }
  }
  return [deleteList, loading] as const;
}
