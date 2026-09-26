"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = { open: boolean; title: string; body: string; confirmLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void };

/** A modal confirmation built on the native <dialog>: focus is trapped, Esc cancels, and no window.confirm is used. */
export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => (e.preventDefault(), onCancel())}
      onClick={(e) => e.target === ref.current && onCancel()}
      className="m-auto w-[min(92vw,24rem)] rounded-2xl border bg-background p-5 text-foreground shadow-lg backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-base font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={onConfirm} disabled={busy} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
