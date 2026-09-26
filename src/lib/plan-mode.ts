"use client";

import { create } from "zustand";

const KEY = "gx:plan-mode";
/** The composer before a chat exists. */
export const NEW_CHAT = "new";

function load(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

type State = { byChat: Record<string, boolean>; hydrated: boolean; hydrate: () => void; set: (chatId: string, on: boolean) => void };

/** Plan mode per chat, remembered in this browser only; the server just receives it with each message. */
export const usePlanModeStore = create<State>((set, get) => ({
  byChat: {},
  hydrated: false,
  hydrate: () => {
    if (!get().hydrated) set({ byChat: load(), hydrated: true });
  },
  set: (chatId, on) => {
    const byChat = { ...get().byChat, [chatId]: on };
    set({ byChat });
    try {
      localStorage.setItem(KEY, JSON.stringify(byChat));
    } catch {
      // Private mode or blocked storage: the toggle still works for this page.
    }
  },
}));

export function usePlanMode(chatId: string) {
  const on = usePlanModeStore((s) => s.byChat[chatId] ?? false);
  const hydrate = usePlanModeStore((s) => s.hydrate);
  const set = usePlanModeStore((s) => s.set);
  return { on, hydrate, setOn: (v: boolean) => set(chatId, v) };
}
