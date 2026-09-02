import { formatRelativeTime, type ListingStatus } from "@unibuzzz/shared";
import { useState } from "react";
import { AdminFilterBar, adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { ConfirmDialog } from "../../features/admin/components/ConfirmDialog";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import { useAdminListings, useModerateListing } from "../../features/admin/hooks";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function AdminMarketplacePage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ListingStatus | "">("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [confirming, setConfirming] = useState<string | null>(null);
  const { data: listings, isLoading } = useAdminListings({
    query: debouncedQuery,
    status: status || undefined,
  });
  const moderate = useModerateListing();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Marketplace</h1>

      <AdminFilterBar query={query} onQueryChange={setQuery} placeholder="Search listing titles…">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ListingStatus | "")}
          className={adminSelectClasses}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
          <option value="removed">Removed</option>
        </select>
      </AdminFilterBar>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {listings?.map((listing) => (
          <li key={listing.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-ink">{listing.title}</p>
              <p className="text-xs text-stone-500">
                {formatPrice(listing.price_cents)} · @{listing.seller.username} ·{" "}
                {formatRelativeTime(listing.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={listing.status} />
              {listing.status !== "removed" && (
                <button
                  type="button"
                  onClick={() => setConfirming(listing.id)}
                  className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Remove
                </button>
              )}
              {listing.status === "removed" && (
                <button
                  type="button"
                  onClick={() => moderate.mutate({ listingId: listing.id, status: "active" })}
                  className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Restore
                </button>
              )}
            </div>
          </li>
        ))}
        {listings?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No listings found.</li>
        )}
      </ul>

      {confirming && (
        <ConfirmDialog
          title="Remove this listing?"
          description="It will be hidden from the marketplace. You can restore it later."
          confirmLabel="Remove"
          isPending={moderate.isPending}
          onCancel={() => setConfirming(null)}
          onConfirm={() =>
            moderate.mutate(
              { listingId: confirming, status: "removed" },
              { onSuccess: () => setConfirming(null) },
            )
          }
        />
      )}
    </div>
  );
}
