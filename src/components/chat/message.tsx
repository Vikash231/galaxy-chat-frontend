import type { Message as MessageType } from "@/lib/api/types";
import { Blocks, ErrorNote, ImageAsset } from "./blocks";

export function Message({ message }: { message: MessageType }) {
  if (message.role === "user") {
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const files = message.content.flatMap((b) => (b.type === "attachment" ? [b] : []));
    return (
      <div className="flex flex-col items-end gap-2">
        {files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {files.map((f) =>
              f.kind === "image" ? (
                <ImageAsset key={f.attachmentId} url={f.url} alt={f.name} small />
              ) : (
                <a key={f.attachmentId} href={f.url} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-2 text-sm underline">
                  {f.name}
                </a>
              ),
            )}
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
    </div>
  );
}
