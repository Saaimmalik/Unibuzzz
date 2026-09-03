import type { NotificationWithActor } from "@unibuzzz/shared";
import { formatRelativeTime } from "@unibuzzz/shared";
import { CheckCircle2, Heart, Mail, MessageCircle, ShieldAlert, Star, Users, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { useMarkNotificationRead } from "./hooks";

const SYSTEM_ICONS = {
  content_removed: ShieldAlert,
  report_resolved: CheckCircle2,
  community_approved: Users,
  community_rejected: XCircle,
} as const;

function notificationText(n: NotificationWithActor): string {
  const actorName = n.actor?.display_name ?? "Someone";

  switch (n.type) {
    case "post_like":
      return `${actorName} liked your post`;
    case "post_comment":
      return n.preview
        ? `${actorName} commented on your post: "${n.preview}"`
        : `${actorName} commented on your post`;
    case "message":
      return n.preview ? `${actorName} sent you a message: "${n.preview}"` : `${actorName} sent you a message`;
    case "review_helpful":
      return `${actorName} found your review helpful`;
    case "content_removed":
      return `Your ${n.preview ?? "content"} was removed by a moderator`;
    case "report_resolved":
      return `Your report was ${n.preview ?? "resolved"}`;
    case "community_approved":
      return `Your community "${n.preview ?? ""}" was approved`;
    case "community_rejected":
      return `Your request to create "${n.preview ?? ""}" wasn't approved`;
  }
}

export function NotificationItem({ notification }: { notification: NotificationWithActor }) {
  const markRead = useMarkNotificationRead();
  const isUnread = !notification.read_at;

  return (
    <Link
      to={notification.link_path}
      onClick={() => {
        if (isUnread) markRead.mutate(notification.id);
      }}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
        isUnread
          ? "border-brand-yellow/40 bg-brand-yellow/10 hover:bg-brand-yellow/15"
          : "border-stone-200 bg-white hover:bg-stone-50"
      }`}
    >
      {notification.actor ? (
        <Avatar displayName={notification.actor.display_name} avatarUrl={notification.actor.avatar_url} size="sm" />
      ) : (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
          {(() => {
            const Icon = SYSTEM_ICONS[notification.type as keyof typeof SYSTEM_ICONS] ?? ShieldAlert;
            return <Icon size={14} />;
          })()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-brand-ink">{notificationText(notification)}</p>
        <p className="mt-0.5 text-xs text-stone-500">{formatRelativeTime(notification.created_at)}</p>
      </div>

      <div className="mt-1.5 shrink-0 text-stone-400">
        {notification.type === "post_like" && <Heart size={16} />}
        {notification.type === "post_comment" && <MessageCircle size={16} />}
        {notification.type === "message" && <Mail size={16} />}
        {notification.type === "review_helpful" && <Star size={16} />}
      </div>

      {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-orange" aria-hidden />}
    </Link>
  );
}
