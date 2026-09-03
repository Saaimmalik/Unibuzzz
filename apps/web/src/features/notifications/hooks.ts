import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const UNREAD_NOTIFICATIONS_QUERY_KEY = ["notifications", "unread-count"] as const;

// Two independent call sites subscribe concurrently (the notifications page
// itself, and the always-mounted AppShell badge) — channelSuffix keeps their
// channel names distinct so one doesn't try to re-subscribe the other's.
function useNotificationsRealtime(recipientId: string | undefined, channelSuffix: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!recipientId) return;

    const channel = supabase
      .channel(`notifications-${channelSuffix}-${recipientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${recipientId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
          void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
        },
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [recipientId, channelSuffix, queryClient]);
}

export function useNotifications() {
  const { appUser } = useAuth();
  useNotificationsRealtime(appUser?.id, "list");

  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchNotifications,
    enabled: !!appUser,
  });
}

export function useUnreadNotificationsCount() {
  const { appUser } = useAuth();
  useNotificationsRealtime(appUser?.id, "badge");

  return useQuery({
    queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchUnreadNotificationsCount,
    enabled: !!appUser,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(appUser!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_NOTIFICATIONS_QUERY_KEY });
    },
  });
}
