"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploads } from "@/lib/uploads/use-uploads";
import { cn } from "@/lib/utils";
import { AttachmentChips } from "./attachment-chips";

const MAX_CHARS = 8000;

type Props = {
  onSend: (text: string, attachmentIds: string[]) => Promise<boolean> | boolean;
  onStop?: () => void;
  running?: boolean;
  stopping?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

/** Multiline input: Enter sends, Shift+Enter adds a line; while a reply runs, the send button becomes Stop. */
export function Composer({ onSend, onStop, running, stopping, disabled, autoFocus }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const uploads = useUploads();
  // The textarea is uncontrolled so hydration can't wipe text typed before React loaded; state only mirrors it.
  useEffect(() => {
    const typed = ref.current?.value;
    if (typed) setText(typed);
  }, []);
  const trimmed = text.trim();
  const tooLong = text.length > MAX_CHARS;
  const canSend = Boolean(trimmed) && !tooLong && !running && !sending && !disabled && !uploads.busy;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    const ok = await onSend(trimmed, uploads.attachmentIds);
    setSending(false);
    if (ok) {
      if (ref.current) ref.current.value = "";
      setText("");
      uploads.clear();
      ref.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div
      className="rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        uploads.add(e.dataTransfer.files);
      }}
      onPaste={(e) => e.clipboardData.files.length && uploads.add(e.clipboardData.files)}
    >
      <AttachmentChips items={uploads.items} onRemove={uploads.remove} onRetry={uploads.retry} />
      <label htmlFor="composer" className="sr-only">
        Message
      </label>
      <textarea
        id="composer"
        ref={ref}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Assign a task or ask anything..."
        rows={1}
        className="field-sizing-content max-h-60 min-h-14 w-full resize-none bg-transparent px-4 pt-4 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between px-3 pb-3">
        <input
          ref={picker}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploads.add(e.target.files);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="ghost" size="icon" aria-label="Attach images, video or audio" onClick={() => picker.current?.click()} disabled={disabled}>
          <Paperclip />
        </Button>
        <div className="flex items-center gap-2">
          {tooLong && <span className="text-xs text-destructive">{text.length}/{MAX_CHARS}</span>}
          {running ? (
            <Button type="button" size="icon" className="rounded-full" onClick={onStop} disabled={stopping} aria-label="Stop reply">
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button type="button" size="icon" className={cn("rounded-full", !canSend && "opacity-40")} onClick={submit} disabled={!canSend} aria-label="Send message">
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
