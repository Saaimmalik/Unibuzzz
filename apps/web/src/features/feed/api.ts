import type {
  AppUser,
  CommentWithAuthor,
  PostMedia,
  PostWithAuthor,
  ReactionType,
} from "@unibuzzz/shared";
import { toIlikePattern } from "../../lib/search";
import { supabase } from "../../lib/supabase";
import { getSignedUrls, uploadPostImage } from "./storage";

export const POSTS_QUERY_KEY = ["posts"] as const;
export const communityPostsQueryKey = (communityId: string) =>
  ["posts", "community", communityId] as const;
export const commentsQueryKey = (postId: string) => ["comments", postId] as const;

export type PostMediaWithUrl = PostMedia & { signedUrl: string | null };
export type FeedPost = Omit<PostWithAuthor, "post_media"> & { post_media: PostMediaWithUrl[] };

type RawPost = Omit<PostWithAuthor, "viewer_reaction" | "post_media"> & {
  author: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
  post_media: PostMedia[];
};

export const POST_SELECT =
  "*, author:users!posts_author_id_fkey(id,username,display_name,avatar_url), post_media(*)";

const ANONYMOUS_AUTHOR_NAME = "Anonymous";

// Masks the author's identity for an anonymous post/comment, for anyone
// but the author themselves — reuses the reviews anonymity convention
// (author hidden from other students, always resolvable by staff via the
// real author_id, which is left untouched here) rather than a new one. See
// the migration comment on posts.is_anonymous for why this can't be a
// static SELECT-column omission the way reviews.reviewer_id is: a single
// feed/community query mixes anonymous and non-anonymous rows.
function maskAnonymousAuthor<
  T extends {
    author_id: string;
    is_anonymous: boolean;
    author: Pick<AppUser, "id" | "username" | "display_name" | "avatar_url">;
  },
>(row: T, viewerId: string): T {
  if (!row.is_anonymous || row.author_id === viewerId) return row;
  return {
    ...row,
    author: {
      id: row.author_id,
      username: "anonymous",
      display_name: ANONYMOUS_AUTHOR_NAME,
      avatar_url: null,
    },
  };
}

// Shared by the main feed, post search, and community posts — all need the
// same "what did the viewer react with" + "resolve signed image URLs" step.
export async function hydratePosts(rawPosts: RawPost[], viewerId: string): Promise<FeedPost[]> {
  if (rawPosts.length === 0) return [];

  const postIds = rawPosts.map((p) => p.id);
  const { data: reactionRows } = await supabase
    .from("reactions")
    .select("target_id, type")
    .eq("user_id", viewerId)
    .eq("target_type", "post")
    .in("target_id", postIds);
  const reactionMap = new Map<string, ReactionType>(
    (reactionRows ?? []).map((r) => [r.target_id, r.type]),
  );

  const allPaths = rawPosts.flatMap((p) => p.post_media.map((m) => m.url));
  const signedUrlMap = await getSignedUrls(allPaths);

  return rawPosts.map((p) =>
    maskAnonymousAuthor(
      {
        ...p,
        viewer_reaction: reactionMap.get(p.id) ?? null,
        post_media: p.post_media.map((m) => ({ ...m, signedUrl: signedUrlMap.get(m.url) ?? null })),
      },
      viewerId,
    ),
  );
}

export async function fetchPosts(viewerId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("deleted_at", null)
    .is("community_id", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

// No deleted_at/community_id filter — RLS already resolves visibility (own
// deleted post, restricted-community membership, etc.), so this can serve
// as the single "get me this one post" lookup for both a plain permalink
// visit and a notification deep link into a moderated/removed post the
// viewer is entitled to see (the author, or staff).
export async function fetchPostById(postId: string, viewerId: string): Promise<FeedPost | null> {
  const { data: post, error } = await supabase.from("posts").select(POST_SELECT).eq("id", postId).maybeSingle();
  if (error) throw error;
  if (!post) return null;

  const [hydrated] = await hydratePosts([post], viewerId);
  return hydrated;
}

// Powers the Feed page's "Following" tab. Takes the followed author ids as
// a param rather than querying `follows` itself, so this file stays
// scoped to posts/comments — the cross-feature composition lives in
// usePostsFollowingFeed (features/feed/hooks.ts).
export async function fetchFollowingPosts(
  authorIds: string[],
  viewerId: string,
): Promise<FeedPost[]> {
  if (authorIds.length === 0) return [];

  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("author_id", authorIds)
    .is("deleted_at", null)
    .is("community_id", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

export async function fetchCommunityPosts(
  communityId: string,
  viewerId: string,
): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("deleted_at", null)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

export async function searchPosts(query: string, viewerId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("deleted_at", null)
    .ilike("body", toIlikePattern(query))
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

// Scoped to the main feed only (community_id is null) — used by the Feed
// page's inline search box. searchPosts above stays the global-search
// version (spans feed + community posts), unchanged.
export async function searchFeedPosts(query: string, viewerId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("deleted_at", null)
    .is("community_id", null)
    .ilike("body", toIlikePattern(query))
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

// Scoped to one community's own posts — used by CommunityPage's inline
// search box.
export async function searchCommunityPosts(
  query: string,
  communityId: string,
  viewerId: string,
): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .is("deleted_at", null)
    .eq("community_id", communityId)
    .ilike("body", toIlikePattern(query))
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return hydratePosts(posts ?? [], viewerId);
}

export async function createPost({
  universityId,
  authorId,
  communityId,
  body,
  image,
  isAnonymous,
}: {
  universityId: string;
  authorId: string;
  communityId?: string | null;
  body: string;
  image?: File | null;
  isAnonymous?: boolean;
}): Promise<void> {
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      university_id: universityId,
      author_id: authorId,
      community_id: communityId ?? null,
      body,
      is_anonymous: isAnonymous ?? false,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (image) {
    const path = await uploadPostImage(universityId, authorId, image);
    const { error: mediaError } = await supabase
      .from("post_media")
      .insert({ post_id: post.id, url: path });
    if (mediaError) throw mediaError;
  }
}

export async function setReaction({
  postId,
  viewerId,
  type,
}: {
  postId: string;
  viewerId: string;
  type: ReactionType;
}): Promise<void> {
  const { error } = await supabase
    .from("reactions")
    .insert({ target_type: "post", target_id: postId, user_id: viewerId, type });
  if (error) throw error;
}

export async function clearReaction({
  postId,
  viewerId,
}: {
  postId: string;
  viewerId: string;
}): Promise<void> {
  const { error } = await supabase
    .from("reactions")
    .delete()
    .eq("target_type", "post")
    .eq("target_id", postId)
    .eq("user_id", viewerId);
  if (error) throw error;
}

export async function softDeletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) throw error;
}

export async function fetchComments(
  postId: string,
  viewerId: string,
): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:users!comments_author_id_fkey(id,username,display_name,avatar_url)")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => maskAnonymousAuthor(c, viewerId));
}

export async function createComment({
  postId,
  authorId,
  body,
  isAnonymous,
}: {
  postId: string;
  authorId: string;
  body: string;
  isAnonymous?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: authorId, body, is_anonymous: isAnonymous ?? false });
  if (error) throw error;
}
