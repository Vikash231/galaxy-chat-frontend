"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "./client";
import type { Chat, ChatDetail, ChatPage, Me, MessagePage, RealtimeAccess, RunView, SendResult, WaitpointAnswer } from "./types";

export const qk = {
  me: ["me"] as const,
  chats: ["chats"] as const, // prefix of every chat list below, so invalidating it refreshes all of them
  chatsPinned: ["chats", "pinned"] as const,
  chatsSearch: (q: string) => ["chats", "search", q] as const,
  chat: (id: string) => ["chat", id] as const,
  messages: (id: string) => ["messages", id] as const,
  run: (id: string) => ["run", id] as const,
};

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => unwrap<Me>(api.GET("/api/v1/me")) });

export const useChats = () =>
  useInfiniteQuery({
    queryKey: [...qk.chats, "recent"] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => unwrap<ChatPage>(api.GET("/api/v1/chats", { params: { query: { limit: 30, cursor: pageParam } } })),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const usePinnedChats = () =>
  useQuery({ queryKey: qk.chatsPinned, queryFn: () => unwrap<ChatPage>(api.GET("/api/v1/chats", { params: { query: { pinned: "true", limit: 50 } } })) });

/** Title search across all chats; nothing is fetched for fewer than 2 characters. */
export const useChatSearch = (q: string) =>
  useInfiniteQuery({
    queryKey: qk.chatsSearch(q),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData, // keep the old results on screen while the next word loads, no flicker
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => unwrap<ChatPage>(api.GET("/api/v1/chats", { params: { query: { q, limit: 30, cursor: pageParam } } })),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useChat = (chatId: string) =>
  useQuery({ queryKey: qk.chat(chatId), queryFn: () => unwrap<ChatDetail>(api.GET("/api/v1/chats/{chatId}", { params: { path: { chatId } } })) });

/** Newest first from the API; pages are reversed into reading order by the caller. */
export const useMessages = (chatId: string) =>
  useInfiniteQuery({
    queryKey: qk.messages(chatId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      unwrap<MessagePage>(api.GET("/api/v1/chats/{chatId}/messages", { params: { path: { chatId }, query: { limit: 30, cursor: pageParam } } })),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const fetchRun = (runId: string) => unwrap<RunView>(api.GET("/api/v1/runs/{runId}", { params: { path: { runId } } }));

export const fetchRunToken = (runId: string) =>
  unwrap<RealtimeAccess>(api.POST("/api/v1/runs/{runId}/token", { params: { path: { runId } } }));

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => unwrap<Chat>(api.POST("/api/v1/chats", { body: { title } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chats }),
  });
}

export type SendVars = { chatId: string; text: string; clientMessageId: string; attachmentIds?: string[]; planMode?: boolean };

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, ...body }: SendVars) =>
      unwrap<SendResult>(api.POST("/api/v1/chats/{chatId}/messages", { params: { path: { chatId } }, body })),
    onSettled: (_d, _e, { chatId }) => {
      qc.invalidateQueries({ queryKey: qk.messages(chatId) });
      qc.invalidateQueries({ queryKey: qk.chats });
    },
  });
}

/** Stop a run. The API records the stop, so re-read the run now instead of waiting for realtime or the next poll. */
export const useCancelRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => unwrap(api.POST("/api/v1/runs/{runId}/cancel", { params: { path: { runId } } })),
    onSuccess: (_d, runId) => qc.invalidateQueries({ queryKey: qk.run(runId) }),
  });
};

/** Answer the question a run is waiting on; the run resumes as soon as the API has saved the answer. */
export const useAnswerWaitpoint = (runId: string, chatId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ waitpointId, answer }: { waitpointId: string; answer: WaitpointAnswer }) =>
      unwrap<{ id: string; status: string }>(api.POST("/api/v1/waitpoints/{waitpointId}/answer", { params: { path: { waitpointId } }, body: answer })),
    // Success or refusal (e.g. it expired meanwhile), re-read the real state so a stale card goes away.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.run(runId) });
      void qc.invalidateQueries({ queryKey: qk.chat(chatId) });
    },
  });
};

/** Pin, unpin or rename a chat, then refresh every chat list. */
export const useUpdateChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, ...body }: { chatId: string; pinned?: boolean; title?: string }) =>
      unwrap<Chat>(api.PATCH("/api/v1/chats/{chatId}", { params: { path: { chatId } }, body })),
    onSuccess: (_d, { chatId }) => {
      void qc.invalidateQueries({ queryKey: qk.chats });
      void qc.invalidateQueries({ queryKey: qk.chat(chatId) });
    },
  });
};

/** Delete a chat. The API refuses while a reply is running; its message becomes the toast. */
export const useDeleteChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => unwrap<{ id: string }>(api.DELETE("/api/v1/chats/{chatId}", { params: { path: { chatId } } })),
    // Only the lists refresh: dropping the open chat's own queries here would make its page refetch and flash "doesn't exist" before we navigate away.
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.chats }),
  });
};

/** Run a failed or stopped reply again. */
export const retryRun = (runId: string) => unwrap<SendResult>(api.POST("/api/v1/runs/{runId}/retry", { params: { path: { runId } } }));
