"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelRun, useChat, useMessages } from "@/lib/api/queries";
import { useLiveRuns } from "@/lib/live-runs";
import { useLiveRun, useReattachActiveRun } from "@/lib/realtime/use-live-run";
import { useSend } from "@/lib/use-send";
import { Composer } from "./composer";
import { LiveReply } from "./live-reply";
import { Message } from "./message";

export function ChatView({ chatId }: { chatId: string }) {
  const chat = useChat(chatId);
  const messages = useMessages(chatId);
  const live = useLiveRuns((s) => s.byChat[chatId]);
  useReattachActiveRun(chatId, chat.data?.activeRun?.runId);
  const { meta, steps, realtimeDown } = useLiveRun(chatId, live);
  const cancel = useCancelRun();
  const { submit } = useSend();
  const scroller = useRef<HTMLDivElement>(null);

  // API pages are newest-first; show oldest-first. The live run's stored placeholder is replaced by the live view.
  const ordered = useMemo(
    () => (messages.data?.pages.flatMap((p) => p.items) ?? []).filter((m) => !live || m.runId !== live.runId).reverse(),
    [messages.data, live],
  );

  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) el.scrollTo({ top: el.scrollHeight });
  }, [ordered.length, steps, meta]);

  if (chat.isError) {
    return <div className="grid flex-1 place-items-center text-muted-foreground">This chat doesn&apos;t exist or you don&apos;t have access to it.</div>;
  }

  return (
    <>
      <header className="border-b px-6 py-3 text-sm font-medium">{chat.data?.chat.title ?? " "}</header>
      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.hasNextPage && (
            <button type="button" onClick={() => messages.fetchNextPage()} className="self-center text-sm text-muted-foreground hover:text-foreground">
              Load earlier messages
            </button>
          )}
          {messages.isPending && <Skeleton className="h-20 w-full" />}
          {ordered.map((m) => (
            <Message key={m.id} message={m} />
          ))}
          {live && <LiveReply meta={meta} steps={steps} reconnecting={realtimeDown} />}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <Composer
          onSend={(text) => submit(chatId, text)}
          running={Boolean(live)}
          stopping={cancel.isPending || meta?.status === "stopping"}
          onStop={() => live && cancel.mutate(live.runId, { onError: (e) => toast.error(e.message) })}
          autoFocus
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">Powered by OpenRouter free models. Replies can be wrong.</p>
      </div>
    </>
  );
}
