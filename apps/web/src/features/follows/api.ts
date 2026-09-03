import type { AppUser } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

export type FollowUser = Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;

const FOLLOW_USER_SELECT = "id,username,display_name,avatar_url";

export async function followUser(
  followerId: string,
  followingId: string,
  universityId: string,
): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId, university_id: universityId });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
}

export async function fetchIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

type FollowerRow = { follower: FollowUser | null };
type FollowingRow = { following: FollowUser | null };

export async function fetchFollowers(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`follower:users!follows_follower_id_fkey(${FOLLOW_USER_SELECT})`)
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data as unknown as FollowerRow[]) ?? [])
    .map((row) => row.follower)
    .filter((u): u is FollowUser => u !== null);
}

export async function fetchFollowing(userId: string): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`following:users!follows_following_id_fkey(${FOLLOW_USER_SELECT})`)
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data as unknown as FollowingRow[]) ?? [])
    .map((row) => row.following)
    .filter((u): u is FollowUser => u !== null);
}

// Used by the Feed page's "Following" tab to scope posts to followed
// authors — see features/feed/api.ts's fetchFollowingPosts.
export async function fetchFollowingIds(followerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", followerId);
  if (error) throw error;
  return (data ?? []).map((r) => r.following_id);
}
