import { formatRelativeTime } from "@unibuzzz/shared";
import { MessageCircle, Tag } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../lib/auth-context";
import {
  useListing,
  useStartMarketplaceConversation,
  useUpdateListingStatus,
} from "../features/marketplace/hooks";

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const { data: listing, isLoading } = useListing(id ?? "");
  const updateStatus = useUpdateListingStatus(id ?? "");
  const startConversation = useStartMarketplaceConversation();
  const [activeImage, setActiveImage] = useState(0);
  const [messageError, setMessageError] = useState<string | null>(null);

  if (isLoading) return <p className="py-10 text-center text-sm text-stone-400">Loading…</p>;
  if (!listing)
    return <p className="py-10 text-center text-sm text-stone-400">Listing not found.</p>;

  const isOwn = listing.seller_id === appUser?.id;

  async function handleMessage() {
    setMessageError(null);
    try {
      const conversationId = await startConversation.mutateAsync(listing!.id);
      navigate(`/messages/${conversationId}`);
    } catch {
      setMessageError("Couldn't start a conversation. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="aspect-square overflow-hidden rounded-2xl bg-stone-100">
        {listing.listing_media.length > 0 ? (
          <img
            src={listing.listing_media[activeImage].url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <Tag size={48} />
          </div>
        )}
      </div>

      {listing.listing_media.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {listing.listing_media.map((media, i) => (
            <button
              key={media.id}
              type="button"
              onClick={() => setActiveImage(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === activeImage ? "border-brand-purple" : "border-transparent"
              }`}
            >
              <img src={media.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-brand-ink">{listing.title}</h1>
          <p className="text-xl font-bold text-brand-purple">{formatPrice(listing.price_cents)}</p>
        </div>
        {listing.status !== "active" && (
          <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500">
            {listing.status === "sold" ? "Sold" : "Removed"}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-brand-yellow/15 px-2.5 py-1 font-medium text-brand-ink">
          {CONDITION_LABELS[listing.condition]}
        </span>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-500">
          {formatRelativeTime(listing.created_at)}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm text-brand-ink">{listing.description}</p>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
        <Avatar displayName={listing.seller.display_name} avatarUrl={listing.seller.avatar_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-ink">
            {listing.seller.display_name}
          </p>
          <p className="text-xs text-stone-500">@{listing.seller.username}</p>
        </div>
      </div>

      {messageError && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {messageError}
        </p>
      )}

      {!isOwn && listing.status === "active" && (
        <button
          type="button"
          onClick={handleMessage}
          disabled={startConversation.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-brand-orange disabled:opacity-60"
        >
          <MessageCircle size={18} />
          Message seller
        </button>
      )}

      {isOwn && listing.status === "active" && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => updateStatus.mutate("sold")}
            disabled={updateStatus.isPending}
            className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-ink hover:bg-brand-orange disabled:opacity-60"
          >
            Mark as sold
          </button>
          <button
            type="button"
            onClick={() => updateStatus.mutate("removed")}
            disabled={updateStatus.isPending}
            className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            Remove listing
          </button>
        </div>
      )}

      {isOwn && listing.status === "sold" && (
        <button
          type="button"
          onClick={() => updateStatus.mutate("active")}
          disabled={updateStatus.isPending}
          className="mt-4 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
        >
          Relist as active
        </button>
      )}
    </div>
  );
}
