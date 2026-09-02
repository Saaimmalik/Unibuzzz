import { Bell } from "lucide-react";
import { ComingSoon } from "../components/ComingSoon";

export function NotificationsPage() {
  return (
    <ComingSoon
      icon={Bell}
      title="Notifications are coming soon"
      description="Likes, comments, messages, and moderation notices will all land here."
    />
  );
}
