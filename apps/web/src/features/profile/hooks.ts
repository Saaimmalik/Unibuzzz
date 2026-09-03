import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { POSTS_QUERY_KEY } from "../feed/api";
import { fetchUserPosts, updateProfile, uploadAvatar, userPostsQueryKey } from "./api";

const USER_POSTS_PAGE_SIZE = 12;

// A "Load more" pattern that grows the query's own limit rather than a
// cursor/infinite-query, so the cache stays a flat FeedPost[] — the same
// shape PostCard's optimistic like/vote/delete mutations already assume
// (see useSetPostReaction in features/feed/hooks.ts).
export function useUserPosts(userId: string | undefined) {
  const { appUser } = useAuth();
  const [limit, setLimit] = useState(USER_POSTS_PAGE_SIZE);
  const queryKey = userPostsQueryKey(userId, limit);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchUserPosts(userId!, appUser!.id, limit),
    enabled: !!appUser && !!userId,
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    posts: query.data ?? [],
    queryKey,
    hasMore: (query.data?.length ?? 0) >= limit,
    loadMore: () => setLimit((l) => l + USER_POSTS_PAGE_SIZE),
  };
}

export function useUpdateProfile() {
  const { appUser, refreshAppUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      displayName: string;
      bio: string;
      degree: string;
      gradYear: number | "";
      avatar?: File | null;
    }) => {
      let avatarUrl: string | undefined;
      if (input.avatar) {
        avatarUrl = await uploadAvatar(appUser!.university_id, appUser!.id, input.avatar);
      }

      await updateProfile(appUser!.id, {
        display_name: input.displayName,
        bio: input.bio || null,
        degree: input.degree || null,
        grad_year: input.gradYear === "" ? null : input.gradYear,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
    },
    onSuccess: async () => {
      await refreshAppUser();
      // Posts already cache the author's stale display_name/avatar_url —
      // refetch so an edited profile shows correctly on past posts too.
      void queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
  });
}
