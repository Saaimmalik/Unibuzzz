import type { UserSearchResult } from "@unibuzzz/shared";
import { toIlikePattern } from "../../lib/search";
import { supabase } from "../../lib/supabase";

const USER_SELECT = "id,username,display_name,avatar_url,email,major";

// Three separate single-column queries (rather than one .or(...) filter)
// so a query containing a comma or parenthesis — which are meaningful in
// PostgREST's .or() filter syntax — can't distort the search instead of
// needing manual escaping.
export async function searchUsers(
  query: string,
  excludeUserId: string,
): Promise<UserSearchResult[]> {
  const pattern = toIlikePattern(query);

  const [byUsername, byDisplayName, byEmail] = await Promise.all([
    supabase
      .from("users")
      .select(USER_SELECT)
      .ilike("username", pattern)
      .neq("id", excludeUserId)
      .limit(10),
    supabase
      .from("users")
      .select(USER_SELECT)
      .ilike("display_name", pattern)
      .neq("id", excludeUserId)
      .limit(10),
    supabase
      .from("users")
      .select(USER_SELECT)
      .ilike("email", pattern)
      .neq("id", excludeUserId)
      .limit(10),
  ]);

  const byId = new Map<string, UserSearchResult>();
  for (const result of [byUsername, byDisplayName, byEmail]) {
    if (result.error) throw result.error;
    for (const user of result.data ?? []) byId.set(user.id, user);
  }

  return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username)).slice(0, 15);
}

export async function fetchUserByUsername(username: string): Promise<UserSearchResult | null> {
  const { data, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}
