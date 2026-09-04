import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  communityPostsQueryKey,
  createPost,
  fetchCommunityPosts,
  type CommunityPostSort,
} from "../feed/api";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  createCommunity,
  fetchCommunities,
  fetchCommunityBySlug,
  joinCommunity,
  leaveCommunity,
} from "./api";

export const COMMUNITIES_QUERY_KEY = ["communities"] as const;
export const communityBySlugQueryKey = (slug: string) => ["communities", slug] as const;

export function useCommunities() {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: COMMUNITIES_QUERY_KEY,
    queryFn: () => fetchCommunities(appUser!.id),
    enabled: !!appUser,
  });
}

export function useCommunity(slug: string) {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: communityBySlugQueryKey(slug),
    queryFn: () => fetchCommunityBySlug(slug, appUser!.id),
    enabled: !!appUser && !!slug,
  });
}

export function useCreateCommunity() {
  const { appUser } = useAuth();

  return useMutation({
    mutationFn: (input: { name: string; description: string; type: "public" | "restricted" }) =>
      createCommunity({
        universityId: appUser!.university_id,
        submittedBy: appUser!.id,
        name: input.name,
        description: input.description,
        type: input.type,
      }),
  });
}

export function useJoinCommunity(slug: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (communityId: string) => joinCommunity(communityId, appUser!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COMMUNITIES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: communityBySlugQueryKey(slug) });
    },
  });
}

export function useLeaveCommunity(slug: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (communityId: string) => leaveCommunity(communityId, appUser!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: COMMUNITIES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: communityBySlugQueryKey(slug) });
    },
  });
}

export function useCommunityPosts(communityId: string, sort: CommunityPostSort = "hot") {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = communityPostsQueryKey(communityId, sort);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchCommunityPosts(communityId, appUser!.id, sort),
    enabled: !!appUser && !!communityId,
  });

  useEffect(() => {
    if (!appUser) return;

    const channel = supabase
      .channel(`community-posts-${communityId}-${sort}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `community_id=eq.${communityId}` },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [appUser, communityId, queryClient, queryKey, sort]);

  return query;
}

export function useCreateCommunityPost(communityId: string) {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { body: string; image?: File | null; isAnonymous?: boolean }) =>
      createPost({
        universityId: appUser!.university_id,
        authorId: appUser!.id,
        communityId,
        body: input.body,
        image: input.image,
        isAnonymous: input.isAnonymous,
      }),
    // Invalidates by the shared ["posts","community",communityId] prefix
    // (not a specific sort's full key) so both the "hot" and "new" sort
    // caches refetch, regardless of which one the poster is currently on.
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["posts", "community", communityId] }),
  });
}
