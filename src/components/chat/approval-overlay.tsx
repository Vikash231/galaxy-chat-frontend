"use client";

import { useEffect, useState } from "react";
import { Clock, Coins, ListChecks, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Waitpoint, WaitpointAnswer } from "@/lib/api/types";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MediaAsset } from "./blocks";

function useSecondsLeft(expiresAt: string) {
  const left = () => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [s, setS] = useState(left);
  useEffect(() => {
    setS(left());
    const t = setInterval(() => setS(left()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `left` only closes over expiresAt
  }, [expiresAt]);
  return s;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Props = {
  waitpoint: Waitpoint;
  submitting: boolean;
  onAnswer: (answer: WaitpointAnswer) => void;
};

/** The question the agent is waiting on, shown above the composer with a countdown to when it expires. */
export function ApprovalOverlay({ waitpoint, submitting, onAnswer }: Props) {
  const secondsLeft = useSecondsLeft(waitpoint.expiresAt);
  const [note, setNote] = useState("");
  const expired = secondsLeft === 0;
  const locked = submitting || expired;
  const r = waitpoint.request;

  const heading =
    r.kind === "plan" ? "Approve this plan?" : r.kind === "credit" ? "Approve this cost?" : r.kind === "media" ? r.question : r.question;
  const Icon = r.kind === "plan" ? ListChecks : r.kind === "credit" ? Coins : MessageCircleQuestion;

  return (
    <section role="group" aria-labelledby="approval-title" className="mb-3 rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <h2 id="approval-title" className="flex-1 text-sm font-medium">
          {heading}
        </h2>
        <span className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", expired ? "text-destructive" : "text-muted-foreground")}>
          <Clock className="size-3.5" />
          {expired ? "Expired" : clock(secondsLeft)}
        </span>
      </div>

      {r.kind === "options" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.options.map((o) => (
            <Button key={o} type="button" variant="outline" size="sm" disabled={locked} onClick={() => onAnswer({ choice: o })}>
              {o}
            </Button>
          ))}
        </div>
      )}

      {r.kind === "media" && (
        <div className="mt-3 flex flex-wrap gap-3">
          {r.files.map((f, i) => (
            <button
              key={f.name}
              type="button"
              disabled={locked}
              onClick={() => onAnswer({ choice: f.name })}
              aria-label={`Choose ${f.kind} ${i + 1}`}
              className="flex flex-col items-center gap-1 rounded-xl border p-1.5 text-xs hover:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
            >
              <span className="pointer-events-none">
                <MediaAsset kind={f.kind} url={f.url} small />
              </span>
              <span className="text-muted-foreground">{f.kind === "image" ? "Image" : f.kind === "video" ? "Video" : "Audio"} {i + 1}</span>
            </button>
          ))}
        </div>
      )}

      {r.kind === "plan" && (
        <div className="mt-3 space-y-3 text-sm">
          <p>{r.summary}</p>
          <ol className="list-decimal space-y-1 pl-5">
            {r.steps.map((s, i) => (
              <li key={i}>{s.text}</li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            {r.estimateMicro > 0 ? `Estimated cost: about ${formatCredits(r.estimateMicro)} credits.` : "No paid tools in this plan."}
          </p>
          <label htmlFor="plan-note" className="sr-only">
            Extra instruction for the agent (optional)
          </label>
          <input
            id="plan-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an instruction, e.g. make it night time (optional)"
            className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={locked} onClick={() => onAnswer({ approve: true, ...(note.trim() && { note: note.trim() }) })}>
              Approve
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => onAnswer({ approve: false, ...(note.trim() && { note: note.trim() }) })}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {r.kind === "credit" && (
        <div className="mt-3 space-y-3 text-sm">
          <ul className="space-y-1">
            {r.tools.map((t, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{t.name}</span>
                <span className="tabular-nums text-muted-foreground">{formatCredits(t.estimateMicro)} credits</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            This step: about {formatCredits(r.stepMicro)} credits. Total for this reply so far: about {formatCredits(r.totalMicro)}.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={locked} onClick={() => onAnswer({ approve: true })}>
              Approve and continue
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => onAnswer({ approve: false })}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {expired && <p className="mt-3 text-xs text-muted-foreground">This question expired. Send a message to continue.</p>}
    </section>
  );
}
