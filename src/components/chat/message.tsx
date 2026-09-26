import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message as MessageType } from "@/lib/api/types";
import { Blocks, ErrorNote, MediaAsset } from "./blocks";

type Props = { message: MessageType; /** Set only on the newest reply when nothing is running: retries it. */ onRetry?: () => void; retrying?: boolean };

export function Message({ message, onRetry, retrying }: Props) {
  if (message.role === "user") {
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const files = message.content.flatMap((b) => (b.type === "attachment" ? [b] : []));
    return (
      <div className="flex flex-col items-end gap-2">
        {files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {files.map((f) => (
              <MediaAsset key={f.attachmentId} kind={f.kind} url={f.url} alt={f.name} small />
            ))}
          </div>
        )}
        <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-[15px] whitespace-pre-wrap">{text}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Blocks blocks={message.content} />
      {message.status === "cancelled" && <p className="text-sm text-muted-foreground">Stopped.</p>}
      {message.status === "failed" && message.error && <ErrorNote message={message.error.message} />}
      {onRetry && (message.status === "failed" || message.status === "cancelled") && message.error?.retryable !== false && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={retrying} aria-label="Retry this reply">
            <RotateCcw /> {retrying ? "Retrying…" : "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}
