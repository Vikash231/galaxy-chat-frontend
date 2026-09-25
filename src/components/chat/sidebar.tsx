"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Coins, MessageSquare, SquarePen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useChats, useMe } from "@/lib/api/queries";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const chats = useChats();
  const me = useMe();
  const items = chats.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/40 md:flex">
      <div className="px-4 pt-4 pb-2 text-lg font-semibold tracking-tight">Galaxy</div>
      <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted">
          <SquarePen className="size-4" /> New task
        </Link>
      </nav>
      <div className="mt-4 px-4 pb-1 text-xs font-medium text-muted-foreground">Recent tasks</div>
      <nav className="flex-1 overflow-y-auto px-2" aria-label="Chats">
        {chats.isPending && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="mx-2 my-2 h-5" />)}
        {chats.isError && <p className="px-2 py-2 text-sm text-destructive">Couldn&apos;t load chats.</p>}
        {items.map((c) => (
          <Link
            key={c.id}
            href={`/c/${c.id}`}
            className={cn("flex items-center gap-2 truncate rounded-lg px-2 py-2 text-sm hover:bg-muted", pathname === `/c/${c.id}` && "bg-muted font-medium")}
          >
            <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{c.title}</span>
          </Link>
        ))}
        {chats.hasNextPage && (
          <button type="button" onClick={() => chats.fetchNextPage()} className="px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
            Load more
          </button>
        )}
      </nav>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground" title="Available credits">
          <Coins className="size-4" />
          {me.data ? me.data.credits.formatted : "…"}
        </span>
        <UserButton />
      </div>
    </aside>
  );
}
