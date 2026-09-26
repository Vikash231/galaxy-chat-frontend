"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Coins, Search, SquarePen, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatSearch, useChats, useDeleteChat, useMe, usePinnedChats, useUpdateChat } from "@/lib/api/queries";
import type { Chat } from "@/lib/api/types";
import { ChatRow } from "./chat-row";
import { ConfirmDialog } from "./confirm-dialog";

/** Debounce a value so a search is not sent on every keystroke. */
function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 250);
  const searching = q.length >= 2;

  const chats = useChats();
  const pinned = usePinnedChats();
  const search = useChatSearch(q);
  const me = useMe();
  const update = useUpdateChat();
  const remove = useDeleteChat();
  const [deleting, setDeleting] = useState<Chat>();

  const recent = chats.data?.pages.flatMap((p) => p.items) ?? [];
  const pinnedItems = pinned.data?.items ?? [];
  const found = search.data?.pages.flatMap((p) => p.items) ?? [];

  const row = (c: Chat) => (
    <ChatRow
      key={c.id}
      chat={c}
      active={pathname === `/c/${c.id}`}
      onPin={(p) => update.mutate({ chatId: c.id, pinned: p }, { onError: (e) => toast.error(e.message) })}
      onRename={(title) => update.mutate({ chatId: c.id, title }, { onError: (e) => toast.error(e.message) })}
      onDelete={() => setDeleting(c)}
    />
  );

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    remove.mutate(target.id, {
      onSuccess: () => {
        setDeleting(undefined);
        if (pathname === `/c/${target.id}`) router.push("/");
      },
      onError: (e) => {
        setDeleting(undefined);
        toast.error(e.message);
      },
    });
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/40 md:flex">
      <div className="px-4 pt-4 pb-2 text-lg font-semibold tracking-tight">Galaxy</div>
      <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted">
          <SquarePen className="size-4" /> New task
        </Link>
      </nav>
      <div className="relative mx-2 mt-2">
        <label htmlFor="chat-search" className="sr-only">
          Search chats
        </label>
        <Search className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground" />
        <input
          id="chat-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          autoComplete="off"
          className="h-8 w-full rounded-lg border bg-background pr-7 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2" aria-label="Chats">
        {searching ? (
          <>
            <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Results</div>
            {search.isPending && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="mx-2 my-2 h-5" />)}
            {search.isError && <p className="px-2 py-2 text-sm text-destructive">Search failed. Try again.</p>}
            {search.isSuccess && found.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No chats match &ldquo;{q}&rdquo;.</p>}
            {found.map(row)}
            {search.hasNextPage && (
              <button type="button" onClick={() => search.fetchNextPage()} className="px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                Load more
              </button>
            )}
          </>
        ) : (
          <>
            {pinnedItems.length > 0 && (
              <>
                <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Pinned</div>
                {pinnedItems.map(row)}
                <div className="h-3" />
              </>
            )}
            <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">Recent tasks</div>
            {chats.isPending && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="mx-2 my-2 h-5" />)}
            {chats.isError && <p className="px-2 py-2 text-sm text-destructive">Couldn&apos;t load chats.</p>}
            {chats.isSuccess && recent.length === 0 && pinnedItems.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No chats yet.</p>}
            {recent.map(row)}
            {chats.hasNextPage && (
              <button type="button" onClick={() => chats.fetchNextPage()} className="px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                Load more
              </button>
            )}
          </>
        )}
      </nav>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground" title="Available credits">
          <Coins className="size-4" />
          {me.data ? me.data.credits.formatted : "…"}
        </span>
        <UserButton />
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this chat?"
        body={deleting ? `"${deleting.title}" will be removed from your list. This can't be undone from the app.` : ""}
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(undefined)}
      />
    </aside>
  );
}
