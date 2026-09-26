"use client";

import { toast } from "sonner";
import { ApiError } from "./api/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchRunToken, qk, retryRun, useSendMessage } from "./api/queries";
import { useLiveRuns } from "./live-runs";

/** Send a message and attach its run for streaming; if a reply is already running, attach to that one instead. */
export function useSend() {
  const send = useSendMessage();
  const attach = useLiveRuns((s) => s.attach);

  async function submit(chatId: string, text: string, attachmentIds: string[] = [], planMode = false): Promise<boolean> {
    try {
      const res = await send.mutateAsync({ chatId, text, attachmentIds, planMode, clientMessageId: crypto.randomUUID() });
      attach(chatId, { ...res.realtime, runId: res.runId });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === "run_active" && typeof e.details?.activeRunId === "string") {
        const runId = e.details.activeRunId;
        fetchRunToken(runId).then((access) => attach(chatId, { ...access, runId }), () => {});
      }
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    }
  }

  return { submit, pending: send.isPending };
}

/** Retry a failed or stopped reply and attach its new run for streaming. The server's refusal (e.g. an image still finishing) is shown as is. */
export function useRetry(chatId: string) {
  const attach = useLiveRuns((s) => s.attach);
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  async function retry(runId: string) {
    setPending(true);
    try {
      const res = await retryRun(runId);
      attach(chatId, { ...res.realtime, runId: res.runId });
      void qc.invalidateQueries({ queryKey: qk.messages(chatId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't retry.");
    } finally {
      setPending(false);
    }
  }

  return { retry, pending };
}
