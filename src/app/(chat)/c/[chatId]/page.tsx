import { ChatView } from "@/components/chat/chat-view";

export default async function Page({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return <ChatView key={chatId} chatId={chatId} />;
}
