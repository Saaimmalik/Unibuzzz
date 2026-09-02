import type { ReactionType } from "@unibuzzz/shared";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  POSTS_QUERY_KEY,
  clearReaction,
  commentsQueryKey,
  createComment,
  createPost,
  fetchComments,
  fetchPosts,
  setReaction,
  softDeletePost,
  type FeedPost,
} from "./api";

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

export function useCreatePost() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { body: string; image?: File | null }) =>
      createPost({
        universityId: appUser!.university_id,
        authorId: appUser!.id,
        body: input.body,
        image: input.image,
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
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: () => fetchComments(postId),
    enabled,
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
    mutationFn: (body: string) => createComment({ postId, authorId: appUser!.id, body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
