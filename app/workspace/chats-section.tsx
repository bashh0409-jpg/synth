"use client";

import { useState } from "react";
import { Archive, ChevronDown } from "lucide-react";

export type Chat = {
  id: number;
  title: string;
};

type ChatsSectionProps = {
  chats: Chat[];
  activeChatId: number | null;
  onCreateChat: () => void;
  onSelectChat: (chatId: number) => void;
};

export default function ChatsSection({
  chats,
  activeChatId,
  onCreateChat,
  onSelectChat,
}: ChatsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
      <button
        aria-controls="chat-list"
        aria-expanded={isExpanded}
        className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-md p-1 text-sm font-medium muted tracking-tight hover:bg-black/10"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        type="button"
      >
        Chats
        <ChevronDown
          className={`ml-2 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
          size={16}
        />
      </button>
      {isExpanded &&
        (chats.length === 0 ? (
          <div
            className="flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-black/10 p-2 text-sm muted"
            id="chat-list"
          >
            <p className="text-sm font-medium muted">No saved chats yet</p>
            <button
              className="flex h-7 cursor-pointer items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
              onClick={onCreateChat}
              type="button"
            >
              <span className="text-[#EC4899]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4771 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z" />
                </svg>
              </span>
              New chat
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-1" id="chat-list">
            <button
              className="flex h-8 hidden shrink-0 cursor-pointer items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2 text-sm font-medium shadow-[0_0_8px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
              onClick={onCreateChat}
              type="button"
            >
              <span className="text-[#EC4899]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M6.91 2.7392C9.80078 0.969243 13.9717 1.35552 17.1473 3.77631C22.8618 7.73425 23.2306 15.5477 21.8416 19.0664C20.1895 23.2492 4.78934 23.4771 2.53793 19.5771C0.541324 16.1178 1.5082 11.7396 4.26645 9.37495C3.69241 6.96567 4.60658 4.0691 6.91 2.7392ZM11.7225 7.58002C10.9173 7.58002 10.2645 8.23284 10.2645 9.03803V11.7763C10.2645 12.5815 10.9173 13.2343 11.7225 13.2343H11.867C12.6722 13.2343 13.325 12.5815 13.325 11.7763V9.03803C13.325 8.23284 12.6722 7.58002 11.867 7.58002ZM16.9959 7.67866C16.2455 7.67869 15.6375 8.2876 15.6375 9.03803V11.7831C15.6375 12.5336 16.2455 13.1425 16.9959 13.1425C17.7464 13.1425 18.3543 12.5336 18.3543 11.7831V9.03803C18.3543 8.28758 17.7464 7.67866 16.9959 7.67866Z" />
                </svg>
              </span>
              New chat
            </button>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
              {chats.map((chat) => (
                <button
                  aria-current={activeChatId === chat.id ? "page" : undefined}
                  className={`group w-full shrink-0 cursor-pointer flex items-center gap-2 justify-between truncate px-3 py-1.5 text-left text-sm transition-colors ${
                    activeChatId === chat.id
                      ? "bg-white font-medium rounded-md text-black dark:bg-white/10 dark:text-white"
                      : "muted font-medium rounded-md  hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
                  }`}
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  type="button"
                >
                  {chat.title}
                  <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Archive aria-hidden="true" size={16} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
