import type { Community, CommunityWithMembership } from "@unibuzzz/shared";
import { slugify } from "@unibuzzz/shared";
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

export async function createCommunity({
  universityId,
  createdBy,
  name,
  description,
  type,
}: {
  universityId: string;
  createdBy: string;
  name: string;
  description: string;
  type: "public" | "restricted";
}): Promise<Community> {
  const baseSlug = slugify(name) || "community";

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("communities")
      .insert({
        university_id: universityId,
        created_by: createdBy,
        name,
        description: description || null,
        type,
        slug,
      })
      .select()
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw error; // not a slug conflict — give up
  }

  throw new Error("Couldn't find an available name for this community. Try a more distinct name.");
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
