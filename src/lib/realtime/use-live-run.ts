"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import { fetchRun, fetchRunToken, qk } from "../api/queries";
import type { RunMeta, StreamPart } from "../api/types";
import { useLiveRuns, type LiveRun } from "../live-runs";

const TERMINAL_META = new Set(["complete", "failed", "cancelled"]);
const TERMINAL_REST = new Set(["completed", "failed", "cancelled"]);
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60_000;

export type LiveStep = { step: number; thinking: string; text: string };

/**
 * Subscribe to one run: metadata (status, tools) and the token stream, straight from Trigger.dev.
 * If realtime fails, poll the REST run view; when the run ends, refetch persisted messages and let them replace the live view.
 */
export function useLiveRun(chatId: string, live: LiveRun | undefined) {
  const qc = useQueryClient();
  const { attach, detach } = useLiveRuns();
  const enabled = Boolean(live);
  const accessToken = live?.publicAccessToken;

  const { run, error: runError } = useRealtimeRun(live?.triggerRunId, { accessToken, enabled });
  const { parts, error: streamError } = useRealtimeStream<StreamPart>(live?.triggerRunId ?? "", "assistant", {
    accessToken,
    enabled,
    timeoutInSeconds: 900,
  });
  const realtimeDown = Boolean(runError || streamError);

  const rest = useQuery({
    queryKey: qk.run(live?.runId ?? "none"),
    queryFn: () => fetchRun(live!.runId),
    enabled: enabled && realtimeDown,
    refetchInterval: 3_000,
  });

  const meta = (run?.metadata as { gx?: RunMeta } | undefined)?.gx;
  const done =
    (meta && TERMINAL_META.has(meta.status)) ||
    Boolean(run && (run.isCompleted || run.isFailed || run.isCancelled)) ||
    Boolean(rest.data && TERMINAL_REST.has(rest.data.run.status));

  useEffect(() => {
    if (!live || !done) return;
    let cancelled = false;
    (async () => {
      // Swap only after the persisted message is loaded, so the reply never flickers or appears twice.
      await Promise.all([
        qc.refetchQueries({ queryKey: qk.messages(chatId) }),
        qc.invalidateQueries({ queryKey: qk.chat(chatId) }),
        qc.invalidateQueries({ queryKey: qk.me }),
        qc.invalidateQueries({ queryKey: qk.chats }),
      ]);
      if (!cancelled) detach(chatId, live.runId);
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, done, live, qc, detach]);

  useEffect(() => {
    if (!live) return;
    const wait = Math.max(new Date(live.expiresAt).getTime() - Date.now() - REFRESH_BEFORE_EXPIRY_MS, 5_000);
    const t = setTimeout(() => {
      fetchRunToken(live.runId)
        .then((fresh) => attach(chatId, { ...fresh, runId: live.runId }))
        .catch(() => {});
    }, wait);
    return () => clearTimeout(t);
  }, [chatId, live, attach]);

  const steps = useMemo(() => {
    const byStep = new Map<number, LiveStep>();
    for (const p of parts) {
      const s = byStep.get(p.step) ?? { step: p.step, thinking: "", text: "" };
      if (p.t === "thinking") s.thinking += p.d;
      else s.text += p.d;
      byStep.set(p.step, s);
    }
    return [...byStep.values()].sort((a, b) => a.step - b.step);
  }, [parts]);

  return { meta, steps, done, realtimeDown };
}

/** After a reload or chat switch, reattach to the chat's active run using server-owned state. */
export function useReattachActiveRun(chatId: string, activeRunId: string | undefined) {
  const { byChat, attach } = useLiveRuns();
  const attached = byChat[chatId];
  useEffect(() => {
    if (!activeRunId || attached?.runId === activeRunId) return;
    let cancelled = false;
    fetchRunToken(activeRunId)
      .then((access) => !cancelled && attach(chatId, { ...access, runId: activeRunId }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chatId, activeRunId, attached?.runId, attach]);
}
