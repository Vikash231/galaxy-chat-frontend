import type { Message as MessageType } from "@/lib/api/types";
import { Blocks, ErrorNote } from "./blocks";

export function Message({ message }: { message: MessageType }) {
  if (message.role === "user") {
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    return (
      <div className="flex justify-end">
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
