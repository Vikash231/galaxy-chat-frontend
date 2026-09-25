"use client";

import { AlertCircle, FileAudio, FileVideo, Loader2, RotateCw, X } from "lucide-react";
import type { UploadItem } from "@/lib/uploads/use-uploads";

/** Files attached in the composer: preview, progress, remove, and retry on failure. */
export function AttachmentChips({ items, onRemove, onRetry }: { items: UploadItem[]; onRemove: (id: string) => void; onRetry: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attachments">
      {items.map((i) => (
        <li key={i.id} className="group relative size-16 overflow-hidden rounded-lg border bg-muted" title={i.error ?? i.name}>
          {i.preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
            <img src={i.preview} alt={i.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              {i.name.match(/\.(mp3|wav|m4a|ogg)$/i) ? <FileAudio className="size-6" /> : <FileVideo className="size-6" />}
            </div>
          )}
          {(i.status === "uploading" || i.status === "processing") && (
            <div className="absolute inset-0 grid place-items-center bg-background/60 text-xs font-medium">
              {i.status === "uploading" ? `${i.progress}%` : <Loader2 className="size-4 animate-spin" aria-label="Processing" />}
            </div>
          )}
          {i.status === "error" && (
            <button type="button" onClick={() => onRetry(i.id)} className="absolute inset-0 grid place-items-center bg-destructive/15 text-destructive" aria-label={`Retry ${i.name}: ${i.error}`}>
              <span className="flex flex-col items-center gap-0.5 text-[10px]">
                <AlertCircle className="size-4" />
                <RotateCw className="size-3" />
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(i.id)}
            className="absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 opacity-0 shadow group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Remove ${i.name}`}
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
