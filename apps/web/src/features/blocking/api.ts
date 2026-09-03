import type { AppUser } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

export type BlockedUserRow = {
  blocked_id: string;
  created_at: string;
  blocked: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
};

export async function fetchBlockedUsers(blockerId: string): Promise<BlockedUserRow[]> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select(
      "blocked_id,created_at,blocked:users!blocked_users_blocked_id_fkey(id,username,display_name,avatar_url)",
    )
    .eq("blocker_id", blockerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlockedUserRow[];
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
  universityId: string,
): Promise<void> {
  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: blockerId, blocked_id: blockedId, university_id: universityId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function fetchIsBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
