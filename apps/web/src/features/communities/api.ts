import type { Community, CommunityWithMembership } from "@unibuzzz/shared";
import { toIlikePattern } from "../../lib/search";
import { supabase } from "../../lib/supabase";

async function withMembership(
  communities: Community[],
  viewerId: string,
): Promise<CommunityWithMembership[]> {
  if (communities.length === 0) return [];

  const { data: memberships } = await supabase
    .from("community_members")
    .select("community_id, role")
    .eq("user_id", viewerId)
    .in(
      "community_id",
      communities.map((c) => c.id),
    );
  const roleMap = new Map((memberships ?? []).map((m) => [m.community_id, m.role]));

  return communities.map((c) => ({ ...c, viewer_role: roleMap.get(c.id) ?? null }));
}

export async function fetchCommunities(viewerId: string): Promise<CommunityWithMembership[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .order("member_count", { ascending: false });
  if (error) throw error;
  return withMembership(data ?? [], viewerId);
}

export async function searchCommunities(
  query: string,
  viewerId: string,
): Promise<CommunityWithMembership[]> {
  const pattern = toIlikePattern(query);
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .ilike("name", pattern)
    .order("member_count", { ascending: false })
    .limit(15);
  if (error) throw error;
  return withMembership(data ?? [], viewerId);
}

export async function fetchCommunityBySlug(
  slug: string,
  viewerId: string,
): Promise<CommunityWithMembership | null> {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withRole] = await withMembership([data], viewerId);
  return withRole;
}

// Community creation now goes through the same admin-approval queue as
// professor/course suggestions (entity_submissions, type='community') — see
// supabase/migrations/20260902280500_entity_submissions_communities.sql.
// The real communities row (and its slug) is only created once an admin
// approves the request via admin_review_entity_submission.
export async function createCommunity({
  universityId,
  submittedBy,
  name,
  description,
  type,
}: {
  universityId: string;
  submittedBy: string;
  name: string;
  description: string;
  type: "public" | "restricted";
}): Promise<void> {
  const { error } = await supabase.from("entity_submissions").insert({
    university_id: universityId,
    submitted_by: submittedBy,
    type: "community",
    payload: { name, description: description || null, type },
  });
  if (error) throw error;
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: userId });
  if (error) throw error;
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}
