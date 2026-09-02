import { useQuery } from "@tanstack/react-query";
import { searchPosts } from "../feed/api";
import { useAuth } from "../../lib/auth-context";
import { searchUsers } from "./api";

const MIN_QUERY_LENGTH = 2;

export function useUserSearch(query: string) {
  const { appUser } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["search", "users", trimmed],
    queryFn: () => searchUsers(trimmed, appUser!.id),
    enabled: !!appUser && trimmed.length >= MIN_QUERY_LENGTH,
  });
}

export function usePostSearch(query: string) {
  const { appUser } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["search", "posts", trimmed],
    queryFn: () => searchPosts(trimmed, appUser!.id),
    enabled: !!appUser && trimmed.length >= MIN_QUERY_LENGTH,
  });
}
