import { Search as SearchIcon, Tag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { PostCard } from "../features/feed/PostCard";
import { useListingSearch } from "../features/marketplace/hooks";
import { usePostSearch, useUserSearch } from "../features/search/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: users, isLoading: usersLoading } = useUserSearch(debouncedQuery);
  const { data: posts, isLoading: postsLoading } = usePostSearch(debouncedQuery);
  const { data: listings, isLoading: listingsLoading } = useListingSearch(debouncedQuery);

  const hasQuery = debouncedQuery.trim().length >= 2;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div className="relative">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, people, or listings…"
          className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
      </div>

      {!hasQuery && (
        <p className="py-8 text-center text-sm text-stone-400">
          Keep typing — search needs 2+ characters.
        </p>
      )}

      {hasQuery && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-stone-500">People</h2>
            {usersLoading && <p className="text-sm text-stone-400">Searching…</p>}
            {!usersLoading && users?.length === 0 && (
              <p className="text-sm text-stone-400">No people found.</p>
            )}
            <ul className="space-y-1">
              {users?.map((user) => (
                <li key={user.id}>
                  <Link
                    to={`/u/${user.username}`}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-brand-purple/40"
                  >
                    <Avatar displayName={user.display_name} avatarUrl={user.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">
                        {user.display_name}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        @{user.username} · {user.email}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-stone-500">Listings</h2>
            {listingsLoading && <p className="text-sm text-stone-400">Searching…</p>}
            {!listingsLoading && listings?.length === 0 && (
              <p className="text-sm text-stone-400">No listings found.</p>
            )}
            <ul className="space-y-1">
              {listings?.map((listing) => (
                <li key={listing.id}>
                  <Link
                    to={`/marketplace/${listing.id}`}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-brand-purple/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-stone-300">
                      {listing.listing_media[0] ? (
                        <img
                          src={listing.listing_media[0].url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Tag size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-ink">
                        {listing.title}
                      </p>
                      <p className="text-xs text-brand-purple">
                        {formatPrice(listing.price_cents)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-stone-500">Posts</h2>
            {postsLoading && <p className="text-sm text-stone-400">Searching…</p>}
            {!postsLoading && posts?.length === 0 && (
              <p className="text-sm text-stone-400">No posts found.</p>
            )}
            <div className="space-y-3">
              {posts?.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
