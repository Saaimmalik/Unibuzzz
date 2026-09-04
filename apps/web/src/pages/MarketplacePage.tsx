import { zodResolver } from "@hookform/resolvers/zod";
import {
  createListingSchema,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  type CreateListingInput,
} from "@unibuzzz/shared";
import { ImagePlus, Plus, Search as SearchIcon, Tag, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthField, authButtonClasses, authInputClasses } from "../components/AuthLayout";
import {
  useCreateListing,
  useListingSearch,
  useListings,
  useMyListings,
} from "../features/marketplace/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";

const CATEGORY_LABELS: Record<string, string> = {
  textbooks: "Textbooks",
  electronics: "Electronics",
  furniture: "Furniture",
  clothing: "Clothing",
  tickets: "Tickets",
  housing: "Housing",
  other: "Other",
};

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<"newest" | "trending">("newest");
  const [isCreating, setIsCreating] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearching = tab === "browse" && debouncedQuery.trim().length >= 2;

  const browseQuery = useListings(
    category as CreateListingInput["category"] | undefined,
    sort,
  );
  const mineQuery = useMyListings();
  const searchQuery = useListingSearch(debouncedQuery);
  const { data: listings, isLoading } = isSearching
    ? searchQuery
    : tab === "browse"
      ? browseQuery
      : mineQuery;

  const createListing = useCreateListing();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: { category: "textbooks", condition: "good" },
  });

  function pickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    setImages((prev) => [...prev, ...files].slice(0, 4));
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: CreateListingInput) {
    setFormError(null);
    try {
      const listingId = await createListing.mutateAsync({
        title: values.title,
        description: values.description,
        priceCents: Math.round(values.priceDollars * 100),
        category: values.category,
        condition: values.condition,
        images,
      });
      reset();
      setImages([]);
      setIsCreating(false);
      navigate(`/marketplace/${listingId}`);
    } catch {
      setFormError("Couldn't create that listing. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-ink">Marketplace</h1>
        <button
          type="button"
          onClick={() => setIsCreating((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-orange"
        >
          <Plus size={16} />
          Sell something
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4"
        >
          <AuthField label="Title" error={errors.title?.message}>
            <input type="text" className={authInputClasses} {...register("title")} />
          </AuthField>
          <AuthField label="Description" error={errors.description?.message}>
            <textarea rows={3} className={authInputClasses} {...register("description")} />
          </AuthField>
          <div className="grid grid-cols-2 gap-3">
            <AuthField label="Price (€)" error={errors.priceDollars?.message}>
              <input
                type="number"
                step="0.01"
                min="0"
                className={authInputClasses}
                {...register("priceDollars")}
              />
            </AuthField>
            <AuthField label="Condition">
              <select className={authInputClasses} {...register("condition")}>
                {LISTING_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ")}
                  </option>
                ))}
              </select>
            </AuthField>
          </div>
          <AuthField label="Category">
            <select className={authInputClasses} {...register("category")}>
              {LISTING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </AuthField>

          <div>
            <div className="mb-1 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(img)}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-stone-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-brand-ink p-0.5 text-white"
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-400 hover:border-brand-purple hover:text-brand-purple"
                  aria-label="Add photo"
                >
                  <ImagePlus size={20} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={pickImages}
            />
            <p className="text-xs text-stone-400">Up to 4 photos</p>
          </div>

          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {formError}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={authButtonClasses}>
            {isSubmitting ? "Posting…" : "Post listing"}
          </button>
        </form>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("browse")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "browse" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
        >
          Browse
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "mine" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
        >
          My listings
        </button>
      </div>

      {tab === "browse" && (
        <>
          <div className="relative">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings…"
              className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
            />
          </div>

          {!isSearching && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSort("newest")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sort === "newest" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSort("trending")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${sort === "trending" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
                >
                  Trending
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory(undefined)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${!category ? "bg-brand-yellow text-black" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
                >
                  All
                </button>
                {LISTING_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${category === c ? "bg-brand-yellow text-black" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {isSearching && query.trim().length < 2 && (
        <p className="py-8 text-center text-sm text-stone-400">
          Keep typing — search needs 2+ characters.
        </p>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading listings…</p>}
      {!isLoading && listings?.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">
          {isSearching
            ? "No listings match that search."
            : tab === "mine"
              ? "You haven't listed anything yet."
              : sort === "trending"
                ? "Nothing trending yet — trending needs some buyer interest first."
                : "No listings yet — be the first to sell something 🐝"}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {listings?.map((listing) => (
          <Link
            key={listing.id}
            to={`/marketplace/${listing.id}`}
            className="overflow-hidden rounded-xl border border-stone-200 bg-white hover:border-brand-purple/40"
          >
            <div className="aspect-square bg-stone-100">
              {listing.listing_media[0] ? (
                <img
                  src={listing.listing_media[0].url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-stone-300">
                  <Tag size={28} />
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-sm font-semibold text-brand-ink">{listing.title}</p>
              <p className="text-sm font-bold text-brand-purple">
                {formatPrice(listing.price_cents)}
              </p>
              {listing.status !== "active" && (
                <span className="text-xs font-semibold text-stone-400">
                  {listing.status === "sold" ? "Sold" : "Removed"}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
