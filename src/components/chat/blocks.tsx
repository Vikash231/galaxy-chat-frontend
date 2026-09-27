"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { AlertCircle, BookOpen, Brain, Check, ChevronDown, Coins, Crop, FileText, Film, ImagePlus, ListChecks, Loader2, MessageCircleQuestion, X } from "lucide-react";
import { formatCredits } from "@/lib/format";
import { hideFileNames } from "@/lib/reply-text";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/api/types";

type ToolInput = { name?: string; skill?: string; path?: string; question?: string; summary?: string; files?: string[] } | undefined;
type ToolOutput = { status?: string; choice?: string; text?: string; note?: string } | undefined;

/** Label, icon and an optional detail read from the tool input (e.g. which skill). */
const TOOL_LABELS: Record<string, { label: string; icon: typeof Crop; detail?: (input: ToolInput, output?: ToolOutput) => string | undefined }> = {
  crop_image: { label: "Crop Image", icon: Crop },
  gpt_image_2: { label: "GPT Image 2", icon: ImagePlus },
  merge_videos: { label: "Merge Videos", icon: Film },
  load_skill: { label: "Skill", icon: BookOpen, detail: (i) => i?.name },
  read_skill_asset: { label: "Skill file", icon: FileText, detail: (i) => i?.skill && i.path && `${i.skill}/${i.path}` },
  ask_user: { label: "Question", icon: MessageCircleQuestion, detail: (i, o) => (o ? (o.status === "answered" ? `${i?.question ?? ""} → ${o.text ?? choiceLabel(i, o.choice)}` : "No answer") : i?.question) },
  propose_plan: {
    label: "Plan",
    icon: ListChecks,
    detail: (i, o) => (o ? `${{ approved: "Approved", declined: "Cancelled" }[o.status ?? ""] ?? "No answer"}${o.note ? ` · ${o.note}` : ""}` : i?.summary),
  },
};

/** A picked file is shown by position ("File 2"), never by its internal name like vid_2. */
function choiceLabel(input: ToolInput, choice = "") {
  const at = input?.files?.indexOf(choice) ?? -1;
  return at >= 0 ? `File ${at + 1}` : choice;
}

/** `shown` holds image URLs already rendered as results; the model sometimes repeats them as markdown images. */
export function Markdown({ text, shown }: { text: string; shown?: Set<string> }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        components={{
          a: (p) => <a {...p} target="_blank" rel="noreferrer" />,
          img: ({ src, alt }) =>
            typeof src === "string" && !shown?.has(src) ? (
              // eslint-disable-next-line @next/next/no-img-element -- model-provided remote image
              <img src={src} alt={alt ?? ""} className="max-h-96 rounded-xl border" />
            ) : null,
        }}
      >
        {hideFileNames(text)}
      </ReactMarkdown>
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
  output?: unknown;
  credits?: string | number;
  durationMs?: number;
  error?: { message: string; code?: string } | null;
};

/**
 * Failures meant only for the model, which it acts on by itself: a question or plan sent in the wrong shape, or a
 * paid tool called before its plan was approved (nothing ran, nothing was charged).
 */
const isModelOnlyFailure = (name: string, status: string, error?: { code?: string } | null) =>
  status === "failed" &&
  (error?.code === "plan_required" || ((name === "ask_user" || name === "propose_plan") && error?.code === "invalid_input"));

export function ToolCard(props: ToolCardProps) {
  if (isModelOnlyFailure(props.name, props.status, props.error)) return null;
  return <ToolCardBody {...props} />;
}

function ToolCardBody({ name, status, input, output, credits, durationMs, error }: ToolCardProps) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_LABELS[name] ?? { label: name, icon: Crop };
  const Icon = meta.icon;
  const detail = meta.detail?.(input as ToolInput, output as ToolOutput);
  const running = status === "pending" || status === "dispatching" || status === "running";
  const failed = status === "failed" || status === "cancelled";
  return (
    <div className={cn("rounded-xl border bg-muted/30 text-sm", failed && "border-destructive/40 bg-destructive/5")}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left" aria-expanded={open}>
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-medium">{meta.label}</span>
        {detail && <span className="truncate text-muted-foreground">{detail}</span>}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {durationMs != null && <span>{(durationMs / 1000).toFixed(1)}s</span>}
          {credits != null && Number(credits) > 0 && <span>{formatCredits(credits)} credits</span>}
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

/** A generated or attached file: images link to the original, video and audio play inline. */
export function MediaAsset({ kind = "image", url, alt, small }: { kind?: "image" | "video" | "audio"; url: string; alt?: string; small?: boolean }) {
  if (kind === "image") return <ImageAsset url={url} alt={alt} small={small} />;
  if (kind === "audio") return <audio src={url} controls preload="metadata" className="w-full max-w-md" aria-label={alt ?? "Audio"} />;
  return (
    <video
      src={url}
      controls
      playsInline
      preload="metadata"
      aria-label={alt ?? "Video"}
      className={cn("max-w-full rounded-xl border bg-black", small ? "max-h-40" : "max-h-96")}
    />
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
  const shown = new Set(blocks.flatMap((b) => (b.type === "asset" ? [b.url] : [])));
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "text":
            return <Markdown key={i} text={b.text} shown={shown} />;
          case "thinking":
            return <Thinking key={i} text={b.text} />;
          case "tool_use": {
            const r = results.get(b.toolCallId);
            return (
              <ToolCard key={i} name={b.name} status={r?.status ?? "cancelled"} input={b.input} output={r?.output} error={r?.error} credits={r?.creditsMicro} durationMs={r?.durationMs} />
            );
          }
          case "asset":
            return <MediaAsset key={i} kind={b.kind} url={b.url} />;
          case "error":
            return <ErrorNote key={i} message={b.error.message} />;
          case "usage":
            return <UsageLine key={i} usage={b} />;
          default:
            return null;
        }
      })}
    </>
  );
}

/** What the reply cost, under the reply: credits spent on tools; tokens and models on hover. */
export function UsageLine({ usage }: { usage: Extract<ContentBlock, { type: "usage" }> }) {
  const detail = `${usage.promptTokens + usage.completionTokens} tokens · ${usage.models.join(", ") || "no model"}`;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" title={detail}>
      <Coins className="size-3.5" />
      {formatCredits(usage.creditsMicro)} credits
    </p>
  );
}
