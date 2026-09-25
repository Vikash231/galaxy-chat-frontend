"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateChat } from "@/lib/api/queries";
import { useSend } from "@/lib/use-send";
import { Composer } from "./composer";

const titleFrom = (text: string) => (text.length > 60 ? `${text.slice(0, 57)}…` : text);

export function NewChat() {
  const router = useRouter();
  const createChat = useCreateChat();
  const { submit } = useSend();

  async function onSend(text: string, attachmentIds: string[]) {
    try {
      const chat = await createChat.mutateAsync(titleFrom(text));
      const ok = await submit(chat.id, text, attachmentIds);
      router.push(`/c/${chat.id}`);
      return ok;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start a new chat.");
      return false;
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-center text-3xl font-semibold tracking-tight">Your AI worker</h1>
        <p className="mt-2 mb-8 text-center text-muted-foreground">Work at the speed of thought.</p>
        <Composer onSend={onSend} autoFocus />
      </div>
    </div>
  );
}
