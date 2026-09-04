import type { ListingCategory, ListingCondition, ListingStatus } from "@unibuzzz/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import {
  createListing,
  fetchListingById,
  fetchListings,
  incrementListingView,
  searchListings,
  startMarketplaceConversation,
  updateListingStatus,
  type ListingSort,
} from "./api";

export const LISTINGS_QUERY_KEY = ["listings"] as const;
export const listingQueryKey = (id: string) => ["listings", id] as const;

export function useListings(category?: ListingCategory, sort: ListingSort = "newest") {
  const queryClient = useQueryClient();
  const queryKey = [...LISTINGS_QUERY_KEY, category ?? "all", sort];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchListings({ category, sort }),
  });

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-listings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => void queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [queryClient]);

  return query;
}

export function useMyListings() {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: [...LISTINGS_QUERY_KEY, "mine", appUser?.id],
    queryFn: () => fetchListings({ sellerId: appUser!.id }),
    enabled: !!appUser,
  });
}

export function useListingSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ["search", "listings", trimmed],
    queryFn: () => searchListings(trimmed),
    enabled: trimmed.length >= 2,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: listingQueryKey(id),
    queryFn: () => fetchListingById(id),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      priceCents: number;
      category: ListingCategory;
      condition: ListingCondition;
      images: File[];
    }) =>
      createListing({
        universityId: appUser!.university_id,
        sellerId: appUser!.id,
        ...input,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
  });
}

export function useUpdateListingStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: ListingStatus) => updateListingStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listingQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY });
    },
  });
}

export function useStartMarketplaceConversation() {
  return useMutation({
    mutationFn: (listingId: string) => startMarketplaceConversation(listingId),
  });
}

// Fire-and-forget view increment, same pattern/reasoning as usePostView in
// features/feed/hooks.ts — best-effort, not a hard-guaranteed count.
export function useListingView(listingId: string | undefined) {
  useEffect(() => {
    if (!listingId) return;
    const key = `viewed-listing-${listingId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void incrementListingView(listingId).catch(() => {});
  }, [listingId]);
}
