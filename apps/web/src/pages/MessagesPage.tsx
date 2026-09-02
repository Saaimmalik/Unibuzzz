import { formatRelativeTime } from "@unibuzzz/shared";
import { Link } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { useConversations } from "../features/messaging/hooks";

export function MessagesPage() {
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-brand-ink">Messages</h1>

      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading messages…</p>}
      {!isLoading && conversations?.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">
          No conversations yet — message someone from their profile 🐝
        </p>
      )}

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {conversations?.map((conversation) => (
          <li key={conversation.id}>
            <Link
              to={`/messages/${conversation.id}`}
              className="flex items-center gap-3 p-4 hover:bg-stone-50"
            >
              <Avatar
                displayName={conversation.other_participant.display_name}
                avatarUrl={conversation.other_participant.avatar_url}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-brand-ink">
                    {conversation.other_participant.display_name}
                  </p>
                  {conversation.last_message_at && (
                    <span className="shrink-0 text-xs text-stone-400">
                      {formatRelativeTime(conversation.last_message_at)}
                    </span>
                  )}
                </div>
                {conversation.listing_title && (
                  <p className="truncate text-xs font-medium text-brand-purple">
                    🏷️ {conversation.listing_title}
                  </p>
                )}
                <p className="truncate text-xs text-stone-500">
                  {conversation.last_message_body ?? "Say hi 👋"}
                </p>
              </div>
              {conversation.unread_count > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-yellow px-1.5 text-xs font-bold text-brand-ink">
                  {conversation.unread_count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
