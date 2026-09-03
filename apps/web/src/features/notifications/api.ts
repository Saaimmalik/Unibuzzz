import type { NotificationWithActor } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

// notifications has two FKs to users (recipient_id and actor_id), so the
// embed must name the constraint — an unqualified `users(...)` is an
// ambiguous relationship PostgREST rejects (same fix as posts' author
// embed in features/feed/api.ts).
const NOTIFICATION_SELECT =
  "*, actor:users!notifications_actor_id_fkey(id,username,display_name,avatar_url)";

export async function fetchNotifications(): Promise<NotificationWithActor[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadNotificationsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", recipientId)
    .is("read_at", null);
  if (error) throw error;
}
