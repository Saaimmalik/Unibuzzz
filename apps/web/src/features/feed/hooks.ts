import type { ReactionType } from "@unibuzzz/shared";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import { fetchFollowingIds } from "../follows/api";
import {
  POSTS_QUERY_KEY,
  TRENDING_POSTS_QUERY_KEY,
  clearReaction,
  commentsQueryKey,
  createComment,
  createPost,
  fetchComments,
  fetchFollowingPosts,
  fetchPostById,
  fetchPosts,
  fetchTrendingPosts,
  incrementPostView,
  searchCommunityPosts,
  searchFeedPosts,
  setReaction,
  softDeletePost,
  type FeedPost,
} from "./api";

export { TRENDING_POSTS_QUERY_KEY };

const SEARCH_MIN_QUERY_LENGTH = 2;

export const FOLLOWING_POSTS_QUERY_KEY = ["posts", "following"] as const;

export const postQueryKey = (postId: string) => ["posts", "single", postId] as const;

export function usePost(postId: string) {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: postQueryKey(postId),
    queryFn: () => fetchPostById(postId, appUser!.id),
    enabled: !!appUser && !!postId,
  });
}

export function usePostsFeed() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: () => fetchPosts(appUser!.id),
    enabled: !!appUser,
  });

  useEffect(() => {
    if (!appUser) return;

    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `university_id=eq.${appUser.university_id}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [appUser, queryClient]);

  return query;
}

export function useFollowingPostsFeed() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: FOLLOWING_POSTS_QUERY_KEY,
    queryFn: async () => {
      const followingIds = await fetchFollowingIds(appUser!.id);
      return fetchFollowingPosts(followingIds, appUser!.id);
    },
    enabled: !!appUser,
  });

  useEffect(() => {
    if (!appUser) return;

    const channel = supabase
      .channel("posts-following-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `university_id=eq.${appUser.university_id}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: FOLLOWING_POSTS_QUERY_KEY }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [appUser, queryClient]);

  return query;
}

export function useTrendingPostsFeed() {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: TRENDING_POSTS_QUERY_KEY,
    queryFn: () => fetchTrendingPosts(appUser!.id),
    enabled: !!appUser,
  });
}

// Fire-and-forget view increment, called once per post-detail-page visit.
// Best-effort only (errors are swallowed) — a missed view count isn't worth
// surfacing to the user or retrying, see the comment on increment_post_view
// in the migration for why this isn't a hard-guaranteed count.
export function usePostView(postId: string | undefined) {
  useEffect(() => {
    if (!postId) return;
    const key = `viewed-post-${postId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void incrementPostView(postId).catch(() => {});
  }, [postId]);
}

export const feedSearchQueryKey = (query: string) =>
  ["search", "feed-posts", query.trim()] as const;

export function useFeedPostSearch(query: string) {
  const { appUser } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: feedSearchQueryKey(trimmed),
    queryFn: () => searchFeedPosts(trimmed, appUser!.id),
    enabled: !!appUser && trimmed.length >= SEARCH_MIN_QUERY_LENGTH,
  });
}

export const communitySearchQueryKey = (communityId: string, query: string) =>
  ["search", "community-posts", communityId, query.trim()] as const;

export function useCommunityPostSearch(communityId: string, query: string) {
  const { appUser } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: communitySearchQueryKey(communityId, trimmed),
    queryFn: () => searchCommunityPosts(trimmed, communityId, appUser!.id),
    enabled: !!appUser && !!communityId && trimmed.length >= SEARCH_MIN_QUERY_LENGTH,
  });
}

export function useCreatePost() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { body: string; image?: File | null; isAnonymous?: boolean }) =>
      createPost({
        universityId: appUser!.university_id,
        authorId: appUser!.id,
        body: input.body,
        image: input.image,
        isAnonymous: input.isAnonymous,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY }),
  });
}

// Scoring matches the DB trigger exactly: like/upvote = +1, downvote = -1.
function scoreDelta(type: ReactionType): number {
  return type === "downvote" ? -1 : 1;
}

function applyReactionOptimistically(post: FeedPost, type: ReactionType): FeedPost {
  const current = post.viewer_reaction;
  if (current === type) {
    return { ...post, viewer_reaction: null, like_count: post.like_count - scoreDelta(type) };
  }
  if (current) {
    return {
      ...post,
      viewer_reaction: type,
      like_count: post.like_count - scoreDelta(current) + scoreDelta(type),
    };
  }
  return { ...post, viewer_reaction: type, like_count: post.like_count + scoreDelta(type) };
}

// Shared by the feed's like button and communities' up/down-vote buttons.
// `queryKey` is whichever cached post list the caller is rendering from
// (the main feed, a community, or search results), so the optimistic
// update lands in the right place; onSettled also invalidates every
// "posts" list broadly since the same post can appear in more than one.
export function useSetPostReaction(queryKey: QueryKey) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ post, type }: { post: FeedPost; type: ReactionType }) => {
      const viewerId = appUser!.id;
      if (post.viewer_reaction === type) {
        await clearReaction({ postId: post.id, viewerId });
      } else if (post.viewer_reaction) {
        await clearReaction({ postId: post.id, viewerId });
        await setReaction({ postId: post.id, viewerId, type });
      } else {
        await setReaction({ postId: post.id, viewerId, type });
      }
    },
    onMutate: async ({ post, type }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FeedPost[]>(queryKey);

      queryClient.setQueryData<FeedPost[]>(queryKey, (old) =>
        old?.map((p) => (p.id === post.id ? applyReactionOptimistically(p, type) : p)),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useToggleLike(queryKey: QueryKey = POSTS_QUERY_KEY) {
  const mutation = useSetPostReaction(queryKey);
  return {
    ...mutation,
    mutate: (post: FeedPost) => mutation.mutate({ post, type: "like" }),
    mutateAsync: (post: FeedPost) => mutation.mutateAsync({ post, type: "like" }),
  };
}

export function useDeletePost(queryKey: QueryKey = POSTS_QUERY_KEY) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => softDeletePost(postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useComments(postId: string, enabled: boolean) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: () => fetchComments(postId, appUser!.id),
    enabled: enabled && !!appUser,
  });

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => void queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [postId, enabled, queryClient]);

  return query;
}

export function useCreateComment(postId: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, isAnonymous }: { body: string; isAnonymous?: boolean }) =>
      createComment({ postId, authorId: appUser!.id, body, isAnonymous }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
