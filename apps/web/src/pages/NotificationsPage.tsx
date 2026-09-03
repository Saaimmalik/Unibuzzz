import { Bell } from "lucide-react";
import { NotificationItem } from "../features/notifications/NotificationItem";
import { useMarkAllNotificationsRead, useNotifications } from "../features/notifications/hooks";

export function NotificationsPage() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread = !!notifications?.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-ink">Notifications</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs font-semibold text-brand-purple hover:underline disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading…</p>}
      {isError && (
        <p className="py-8 text-center text-sm text-red-600">Couldn't load notifications. Try refreshing.</p>
      )}

      {notifications && notifications.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Bell size={32} className="text-stone-300" />
          <p className="text-sm text-stone-400">
            Likes, comments, messages, and moderation notices will show up here.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {notifications?.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </div>
  );
}
