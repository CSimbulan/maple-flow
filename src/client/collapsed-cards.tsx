"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

/**
 * Which cards on a board are collapsed to just their title. A per-person view setting, kept in
 * this browser's localStorage (per board), so it survives moving a card to another list and
 * reloading the page. Nothing is sent to the server.
 */
type CollapsedCards = { collapsed: ReadonlySet<string>; toggle: (cardId: string) => void };

const Context = createContext<CollapsedCards | null>(null);

const EMPTY: ReadonlySet<string> = new Set();
const storageKey = (boardId: string) => `mf-collapsed-cards:${boardId}`;

// A tiny store over localStorage: one cached Set per board (so snapshots are stable between
// renders, as useSyncExternalStore needs) and the components listening for changes.
const cache = new Map<string, ReadonlySet<string>>();
const listeners = new Set<() => void>();

function read(boardId: string): ReadonlySet<string> {
  let ids = cache.get(boardId);
  if (!ids) {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey(boardId)) ?? "[]");
      ids = new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
    } catch {
      // Blocked or corrupt storage: start with everything expanded.
      ids = EMPTY;
    }
    cache.set(boardId, ids);
  }
  return ids;
}

function write(boardId: string, ids: ReadonlySet<string>) {
  cache.set(boardId, ids);
  try {
    localStorage.setItem(storageKey(boardId), JSON.stringify([...ids]));
  } catch {
    // Can't save (private window, full storage): it still works until the page reloads.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function CollapsedCardsProvider({
  boardId,
  children,
}: {
  boardId: string;
  children: ReactNode;
}) {
  // The server render (and hydration) sees nothing collapsed; the browser then reads storage.
  const collapsed = useSyncExternalStore(
    subscribe,
    () => read(boardId),
    () => EMPTY,
  );

  const toggle = useCallback(
    (cardId: string) => {
      const next = new Set(read(boardId));
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      write(boardId, next);
    },
    [boardId],
  );

  const value = useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Whether `cardId` is collapsed, and how to flip it. Without a provider, never collapsed. */
export function useCardCollapsed(cardId: string): [boolean, (() => void) | undefined] {
  const ctx = useContext(Context);
  return [ctx?.collapsed.has(cardId) ?? false, ctx ? () => ctx.toggle(cardId) : undefined];
}
