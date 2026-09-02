import type { ConversationWithParticipant, Message } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

export async function fetchConversations(viewerId: string): Promise<ConversationWithParticipant[]> {
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  if (!conversations || conversations.length === 0) return [];

  const conversationIds = conversations.map((c) => c.id);

  const { data: otherParticipants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user:users(id,username,display_name,avatar_url)")
    .in("conversation_id", conversationIds)
    .neq("user_id", viewerId);
  const otherByConversation = new Map(
    (otherParticipants ?? []).map((p) => [p.conversation_id, p.user]),
  );

  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .neq("sender_id", viewerId)
    .is("read_at", null);
  const unreadCounts = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadCounts.set(row.conversation_id, (unreadCounts.get(row.conversation_id) ?? 0) + 1);
  }

  const listingIds = conversations.map((c) => c.listing_id).filter((id): id is string => !!id);
  const listingTitleById = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listingRows } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);
    for (const l of listingRows ?? []) listingTitleById.set(l.id, l.title);
  }

  return conversations
    .filter((c) => otherByConversation.has(c.id))
    .map((c) => ({
      ...c,
      other_participant: otherByConversation.get(c.id)!,
      unread_count: unreadCounts.get(c.id) ?? 0,
      listing_title: c.listing_id ? (listingTitleById.get(c.listing_id) ?? null) : null,
    }));
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage({
  conversationId,
  senderId,
  body,
}: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

export async function markConversationRead(
  conversationId: string,
  viewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", viewerId)
    .is("read_at", null);
  if (error) throw error;
}

export async function startDmConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_dm_conversation", {
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  return data;
}
