import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
  startDmConversation,
} from "./api";

export const CONVERSATIONS_QUERY_KEY = ["conversations"] as const;
export const messagesQueryKey = (conversationId: string) => ["messages", conversationId] as const;

export function useConversations() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: () => fetchConversations(appUser!.id),
    enabled: !!appUser,
  });

  useEffect(() => {
    if (!appUser) return;

    const channel = supabase
      .channel("conversations-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [appUser, queryClient]);

  return query;
}

export function useMessages(conversationId: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = messagesQueryKey(conversationId);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [conversationId, queryClient, queryKey]);

  // Mark the other person's messages as read once they've loaded — the
  // dependency on query.data means this re-runs (and no-ops, since
  // markConversationRead only touches unread rows) as new messages arrive
  // while the thread stays open.
  useEffect(() => {
    if (!appUser || !conversationId || !query.data || query.data.length === 0) return;
    void markConversationRead(conversationId, appUser.id).then(() => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    });
  }, [appUser, conversationId, query.data, queryClient]);

  return query;
}

export function useSendMessage(conversationId: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => sendMessage({ conversationId, senderId: appUser!.id, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
  });
}

export function useStartConversation() {
  return useMutation({
    mutationFn: (otherUserId: string) => startDmConversation(otherUserId),
  });
}
