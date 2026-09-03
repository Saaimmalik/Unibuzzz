import { supabase } from "../../lib/supabase";
import { POST_SELECT, hydratePosts, type FeedPost } from "../feed/api";

const AVATAR_BUCKET = "avatars";

export const userPostsQueryKey = (userId: string | undefined, limit: number) =>
  ["posts", "user", userId, limit] as const;

// RLS on `posts` already restricts what's visible (university, soft-delete
// exemptions, restricted-community membership) — this query just filters to
// one author and lets RLS do the rest, so it works unchanged for both the
// viewer's own profile and someone else's.
export async function fetchUserPosts(
  authorId: string,
  viewerId: string,
  limit: number,
): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

export async function uploadAvatar(
  universityId: string,
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${universityId}/${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;

  // Public bucket, so the URL is stable and needs no signing — unlike
  // post-media, see the migration comment for why avatars trade privacy
  // for simplicity here.
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-bust since the path is stable across re-uploads
}

export async function updateProfile(
  userId: string,
  updates: {
    display_name: string;
    bio: string | null;
    degree: string | null;
    grad_year: number | null;
    avatar_url?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("users").update(updates).eq("id", userId);
  if (error) throw error;
}
