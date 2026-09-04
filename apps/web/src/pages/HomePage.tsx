import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { PostCard } from "../features/feed/PostCard";
import { PostComposer } from "../features/feed/PostComposer";
import {
  FOLLOWING_POSTS_QUERY_KEY,
  TRENDING_POSTS_QUERY_KEY,
  feedSearchQueryKey,
  useFeedPostSearch,
  useFollowingPostsFeed,
  usePostsFeed,
  useTrendingPostsFeed,
} from "../features/feed/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";

export function HomePage() {
  const [tab, setTab] = useState<"forYou" | "following" | "trending">("forYou");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearching = debouncedQuery.trim().length >= 2;

  const forYouQuery = usePostsFeed();
  const followingQuery = useFollowingPostsFeed();
  const trendingQuery = useTrendingPostsFeed();
  const searchQuery = useFeedPostSearch(debouncedQuery);

  const {
    data: posts,
    isLoading,
    isError,
  } = isSearching
    ? searchQuery
    : tab === "forYou"
      ? forYouQuery
      : tab === "following"
        ? followingQuery
        : trendingQuery;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      {!isSearching && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("forYou")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "forYou" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
          >
            For You
          </button>
          <button
            type="button"
            onClick={() => setTab("following")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "following" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
          >
            Following
          </button>
          <button
            type="button"
            onClick={() => setTab("trending")}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === "trending" ? "bg-brand-ink text-white" : "text-stone-500 hover:bg-stone-100"}`}
          >
            Trending
          </button>
        </div>
      )}

      <div className="relative">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the feed…"
          className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
      </div>

      <PostComposer />

      {isSearching && query.trim().length < 2 && (
        <p className="py-8 text-center text-sm text-stone-400">
          Keep typing — search needs 2+ characters.
        </p>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading…</p>}
      {isError && (
        <p className="py-8 text-center text-sm text-red-600">
          Couldn't load posts. Try refreshing.
        </p>
      )}

      {!isLoading && posts && posts.length === 0 && isSearching && (
        <p className="py-8 text-center text-sm text-stone-400">No matching posts in the feed.</p>
      )}
      {!isLoading && posts && posts.length === 0 && !isSearching && tab === "forYou" && (
        <p className="py-8 text-center text-sm text-stone-400">
          No posts yet — be the first to say something 🐝
        </p>
      )}
      {!isLoading && posts && posts.length === 0 && !isSearching && tab === "following" && (
        <p className="py-8 text-center text-sm text-stone-400">
          Posts from people you follow will show up here — follow someone from their profile to get
          started.
        </p>
      )}
      {!isLoading && posts && posts.length === 0 && !isSearching && tab === "trending" && (
        <p className="py-8 text-center text-sm text-stone-400">
          Nothing trending yet — trending posts need some likes and comments first.
        </p>
      )}

      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          queryKey={
            isSearching
              ? feedSearchQueryKey(debouncedQuery)
              : tab === "forYou"
                ? undefined
                : tab === "following"
                  ? FOLLOWING_POSTS_QUERY_KEY
                  : TRENDING_POSTS_QUERY_KEY
          }
        />
      ))}
    </div>
  );
}
