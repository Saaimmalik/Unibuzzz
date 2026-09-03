import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import {
  fetchFollowers,
  fetchFollowing,
  fetchIsFollowing,
  followUser,
  unfollowUser,
} from "./api";

export const followersQueryKey = (userId: string) => ["follows", "followers", userId] as const;
export const followingQueryKey = (userId: string) => ["follows", "following", userId] as const;
const isFollowingQueryKey = (followerId: string, followingId: string) =>
  ["follows", "status", followerId, followingId] as const;

export function useIsFollowing(targetUserId: string | undefined) {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: isFollowingQueryKey(appUser?.id ?? "", targetUserId ?? ""),
    queryFn: () => fetchIsFollowing(appUser!.id, targetUserId!),
    enabled: !!appUser && !!targetUserId && appUser.id !== targetUserId,
  });
}

export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: followersQueryKey(userId ?? ""),
    queryFn: () => fetchFollowers(userId!),
    enabled: !!userId,
  });
}

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: followingQueryKey(userId ?? ""),
    queryFn: () => fetchFollowing(userId!),
    enabled: !!userId,
  });
}

// Toggles follow state for one target user. Not optimistic (mirrors
// useJoinCommunity/useLeaveCommunity) — invalidates the status query, both
// follower/following lists (in case a list dialog is open), the cached
// profile lookup (its denormalized follower_count/following_count), and
// refreshes the viewer's own appUser (their own following_count).
export function useToggleFollow(targetUserId: string) {
  const { appUser, refreshAppUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isFollowing: boolean) =>
      isFollowing
        ? unfollowUser(appUser!.id, targetUserId)
        : followUser(appUser!.id, targetUserId, appUser!.university_id),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["follows"] });
      void queryClient.invalidateQueries({ queryKey: ["user-by-username"] });
      // Following/unfollowing changes who the Following feed tab includes.
      void queryClient.invalidateQueries({ queryKey: ["posts", "following"] });
      await refreshAppUser();
    },
  });
}
