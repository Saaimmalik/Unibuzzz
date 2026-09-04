import type {
  ListingCategory,
  ListingCondition,
  ListingMedia,
  ListingStatus,
  ListingWithSeller,
} from "@unibuzzz/shared";
import { toIlikePattern } from "../../lib/search";
import { supabase } from "../../lib/supabase";
import { getSignedUrls, uploadListingImage } from "./storage";

const LISTING_SELECT =
  "*, seller:users!listings_seller_id_fkey(id,username,display_name,avatar_url), listing_media(*)";

type RawListing = Omit<ListingWithSeller, "listing_media"> & { listing_media: ListingMedia[] };

async function hydrateListings(raw: RawListing[]): Promise<ListingWithSeller[]> {
  if (raw.length === 0) return [];
  const allPaths = raw.flatMap((l) => l.listing_media.map((m) => m.url));
  const signedUrlMap = await getSignedUrls(allPaths);

  return raw.map((l) => ({
    ...l,
    listing_media: l.listing_media
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((m) => ({ ...m, url: signedUrlMap.get(m.url) ?? m.url })),
  }));
}

export type ListingSort = "newest" | "trending";

export async function fetchListings(filters: {
  category?: ListingCategory;
  sellerId?: string;
  sort?: ListingSort;
}): Promise<ListingWithSeller[]> {
  let query = supabase.from("listings").select(LISTING_SELECT);

  // Browsing (no sellerId) only ever shows active listings. "My listings"
  // (sellerId set) is a management view, so it should show sold/removed
  // too — RLS already limits "removed" visibility to the seller anyway.
  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  } else {
    query = query.eq("status", "active");
  }
  if (filters.category) query = query.eq("category", filters.category);

  query =
    filters.sort === "trending"
      ? query.gt("trending_score", 0).order("trending_score", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(60);
  if (error) throw error;
  return hydrateListings(data ?? []);
}

export async function searchListings(query: string): Promise<ListingWithSeller[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .ilike("title", toIlikePattern(query))
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return hydrateListings(data ?? []);
}

export async function fetchListingById(id: string): Promise<ListingWithSeller | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [hydrated] = await hydrateListings([data]);
  return hydrated;
}

export async function createListing({
  universityId,
  sellerId,
  title,
  description,
  priceCents,
  category,
  condition,
  images,
}: {
  universityId: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  category: ListingCategory;
  condition: ListingCondition;
  images: File[];
}): Promise<string> {
  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      university_id: universityId,
      seller_id: sellerId,
      title,
      description,
      price_cents: priceCents,
      category,
      condition,
    })
    .select("id")
    .single();
  if (error) throw error;

  for (let i = 0; i < images.length; i++) {
    const path = await uploadListingImage(universityId, sellerId, images[i]);
    const { error: mediaError } = await supabase
      .from("listing_media")
      .insert({ listing_id: listing.id, url: path, position: i });
    if (mediaError) throw mediaError;
  }

  return listing.id;
}

export async function updateListingStatus(id: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from("listings").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function startMarketplaceConversation(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_marketplace_conversation", {
    p_listing_id: listingId,
  });
  if (error) throw error;
  return data;
}

export async function incrementListingView(listingId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_listing_view", { p_listing_id: listingId });
  if (error) throw error;
}
