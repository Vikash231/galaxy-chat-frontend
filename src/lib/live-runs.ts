import { create } from "zustand";
import type { RealtimeAccess } from "./api/types";

export type LiveRun = RealtimeAccess & { runId: string };

type State = {
  byChat: Record<string, LiveRun>;
  /** Runs this tab saw finish; never reattached, even if a stale server response still calls them active. */
  ended: Record<string, true>;
  attach: (chatId: string, run: LiveRun) => void;
  detach: (chatId: string, runId: string) => void;
};

/** The run each chat is currently streaming; server state stays in TanStack Query. */
export const useLiveRuns = create<State>((set) => ({
  byChat: {},
  ended: {},
  attach: (chatId, run) => set((s) => ({ byChat: { ...s.byChat, [chatId]: run } })),
  detach: (chatId, runId) =>
    set((s) => {
      if (s.byChat[chatId]?.runId !== runId) return s;
      const byChat = { ...s.byChat };
      delete byChat[chatId];
      return { byChat, ended: { ...s.ended, [runId]: true } };
    }),
}));
