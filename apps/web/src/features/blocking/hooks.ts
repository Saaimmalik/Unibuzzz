import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { blockUser, fetchBlockedUsers, fetchIsBlocked, unblockUser } from "./api";

const BLOCKED_USERS_QUERY_KEY = ["blocked-users"] as const;

export function useBlockedUsers() {
  const { appUser } = useAuth();
  return useQuery({
    queryKey: BLOCKED_USERS_QUERY_KEY,
    queryFn: () => fetchBlockedUsers(appUser!.id),
    enabled: !!appUser,
  });
}

export function useIsBlocked(targetUserId: string | undefined) {
  const { appUser } = useAuth();
  return useQuery({
    queryKey: ["blocked-users", "check", targetUserId],
    queryFn: () => fetchIsBlocked(appUser!.id, targetUserId!),
    enabled: !!appUser && !!targetUserId,
  });
}

export function useBlockUser() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      blockUser(appUser!.id, targetUserId, appUser!.university_id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_QUERY_KEY }),
  });
}

export function useUnblockUser() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => unblockUser(appUser!.id, targetUserId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_QUERY_KEY }),
  });
}
