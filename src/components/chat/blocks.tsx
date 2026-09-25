"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { AlertCircle, Brain, Check, ChevronDown, Crop, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/api/types";

const TOOL_LABELS: Record<string, { label: string; icon: typeof Crop }> = {
  crop_image: { label: "Crop Image", icon: Crop },
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>{text}</ReactMarkdown>
    </div>
  );
}

export function Thinking({ text, live }: { text: string; live?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  return (
    <div className="text-sm text-muted-foreground">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 hover:text-foreground" aria-expanded={open}>
        <Brain className="size-4" />
        {live ? "Thinking…" : "Thought process"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="mt-2 border-l-2 pl-3 whitespace-pre-wrap">{text}</p>}
    </div>
  );
}

type ToolCardProps = {
  name: string;
  status: string;
  input?: unknown;
  credits?: string;
  durationMs?: number;
  error?: { message: string } | null;
};

export function ToolCard({ name, status, input, credits, durationMs, error }: ToolCardProps) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_LABELS[name] ?? { label: name, icon: Crop };
  const Icon = meta.icon;
  const running = status === "pending" || status === "dispatching" || status === "running";
  const failed = status === "failed" || status === "cancelled";
  return (
    <div className={cn("rounded-xl border bg-muted/30 text-sm", failed && "border-destructive/40 bg-destructive/5")}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left" aria-expanded={open}>
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-medium">{meta.label}</span>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {durationMs != null && <span>{(durationMs / 1000).toFixed(1)}s</span>}
          {credits && credits !== "0" && <span>{(Number(credits) / 1_000_000).toFixed(3)} credits</span>}
          {running && <Loader2 className="size-4 animate-spin" aria-label="Running" />}
          {status === "completed" && <Check className="size-4 text-emerald-600" aria-label="Completed" />}
          {failed && <X className="size-4 text-destructive" aria-label={status} />}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {failed && error && <p className="px-3 pb-2.5 text-destructive">{error.message}</p>}
      {open && input !== undefined && (
        <pre className="mx-3 mb-3 overflow-x-auto rounded-lg bg-background p-2 text-xs">{JSON.stringify(input, null, 2)}</pre>
      )}
    </div>
  );
}

export function ImageAsset({ url, alt = "Generated image", small }: { url: string; alt?: string; small?: boolean }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block w-fit overflow-hidden rounded-xl border">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote provider URLs, sizes unknown ahead of time */}
      <img src={url} alt={alt} className={cn("max-w-full object-contain", small ? "max-h-40" : "max-h-96")} loading="lazy" />
    </a>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Render stored blocks in order; a tool call and its result share one card. */
export function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  const results = new Map(blocks.flatMap((b) => (b.type === "tool_result" ? [[b.toolCallId, b] as const] : [])));
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text":
            return <Markdown key={i} text={b.text} />;
          case "thinking":
            return <Thinking key={i} text={b.text} />;
          case "tool_use": {
            const r = results.get(b.toolCallId);
            return <ToolCard key={i} name={b.name} status={r?.status ?? "cancelled"} input={b.input} error={r?.error} />;
          }
          case "asset":
            return b.kind === "image" ? <ImageAsset key={i} url={b.url} /> : null;
          case "error":
            return <ErrorNote key={i} message={b.error.message} />;
          default:
            return null;
        }
      })}
    </>
  );
}
