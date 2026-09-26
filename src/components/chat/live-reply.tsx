"use client";

import { Loader2 } from "lucide-react";
import type { RunMeta } from "@/lib/api/types";
import type { LiveStep } from "@/lib/realtime/use-live-run";
import { ErrorNote, Markdown, MediaAsset, Thinking, ToolCard } from "./blocks";

const STEP_OF = (seq: number) => Math.floor(seq / 100);

/** The reply while it streams: per LLM step, its thinking, text and tool cards, in order. */
export function LiveReply({ meta, steps, reconnecting }: { meta?: RunMeta; steps: LiveStep[]; reconnecting: boolean }) {
  const tools = Object.entries(meta?.tools ?? {}).sort(([, a], [, b]) => a.seq - b.seq);
  const shown = new Set(tools.flatMap(([, t]) => (t.assetUrl ? [t.assetUrl] : [])));
  const stepNumbers = [...new Set([...steps.map((s) => s.step), ...tools.map(([, t]) => STEP_OF(t.seq))])].sort((a, b) => a - b);
  const status = meta?.status ?? "thinking";
  const label = meta?.label ? `${meta.label}…` : status === "working" ? "Working…" : status === "stopping" ? "Stopping…" : "Thinking…";

  return (
    <div className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
      {stepNumbers.map((n) => {
        const s = steps.find((x) => x.step === n);
        return (
          <div key={n} className="flex flex-col gap-3">
            {s && <Thinking text={s.thinking} live />}
            {s?.text && <Markdown text={s.text} shown={shown} />}
            {tools
              .filter(([, t]) => STEP_OF(t.seq) === n)
              .map(([key, t]) => (
                <div key={key} className="flex flex-col gap-3">
                  <ToolCard name={t.name} status={t.status} credits={t.credits} durationMs={t.durationMs} error={t.error} />
                  {t.assetUrl && <MediaAsset kind={t.assetKind} url={t.assetUrl} />}
                </div>
              ))}
          </div>
        );
      })}
      {meta?.status === "failed" && meta.error && <ErrorNote message={meta.error.message} />}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {reconnecting ? "Reconnecting…" : label}
      </div>
    </div>
  );
}
