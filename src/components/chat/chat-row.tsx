"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chat } from "@/lib/api/types";

type Props = {
  chat: Chat;
  active: boolean;
  onPin: (pinned: boolean) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

const item = "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted";

/** One sidebar row: the chat link, and a menu to pin, rename or delete it. */
export function ChatRow({ chat, active, onPin, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  // Enter and the blur it causes, or Escape and its blur, must not save twice or save after a cancel.
  const finished = useRef(false);
  // When the menu closes it hands focus back to its button, which can land just after the input appears and
  // steal focus. So the input takes focus again shortly after, and ignores a blur in its first moments.
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);

  function startRename() {
    finished.current = false;
    startedAt.current = Date.now();
    setDraft(chat.title);
    setEditing(true);
  }

  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [editing]);

  function save() {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const title = draft.trim();
    if (title && title !== chat.title) onRename(title);
    else setDraft(chat.title);
  }

  if (editing) {
    return (
      <div className="px-2 py-1">
        <label htmlFor={`rename-${chat.id}`} className="sr-only">
          Chat name
        </label>
        <input
          id={`rename-${chat.id}`}
          ref={inputRef}
          autoFocus
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => {
            if (Date.now() - startedAt.current < 300) inputRef.current?.focus();
            else save();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              finished.current = true;
              setDraft(chat.title);
              setEditing(false);
            }
          }}
          className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center rounded-lg hover:bg-muted", active && "bg-muted")}>
      <Link href={`/c/${chat.id}`} className={cn("flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm", active && "font-medium")}>
        {chat.pinned ? <Pin className="size-4 shrink-0 text-muted-foreground" /> : <MessageSquare className="size-4 shrink-0 text-muted-foreground" />}
        <span className="truncate">{chat.title}</span>
      </Link>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Options for ${chat.title}`}
          className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 outline-none hover:bg-background focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40 group-hover:opacity-100 data-[popup-open]:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-40 rounded-lg border bg-background p-1 shadow-md outline-none">
              <Menu.Item className={item} onClick={() => onPin(!chat.pinned)}>
                {chat.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                {chat.pinned ? "Unpin" : "Pin"}
              </Menu.Item>
              <Menu.Item
                className={item}
                onClick={startRename}
              >
                <Pencil className="size-4" /> Rename
              </Menu.Item>
              <Menu.Item className={cn(item, "text-destructive")} onClick={onDelete}>
                <Trash2 className="size-4" /> Delete
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
