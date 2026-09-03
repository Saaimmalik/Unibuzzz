import { Flag, Lock, Search as SearchIcon, Users } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { PostCard } from "../features/feed/PostCard";
import { PostComposer } from "../features/feed/PostComposer";
import { communityPostsQueryKey } from "../features/feed/api";
import { communitySearchQueryKey, useCommunityPostSearch } from "../features/feed/hooks";
import { ReportDialog } from "../features/reports/ReportDialog";
import {
  useCommunity,
  useCommunityPosts,
  useJoinCommunity,
  useLeaveCommunity,
} from "../features/communities/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";

export function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: community, isLoading: communityLoading } = useCommunity(slug ?? "");
  const join = useJoinCommunity(slug ?? "");
  const leave = useLeaveCommunity(slug ?? "");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearching = debouncedQuery.trim().length >= 2;

  const feedQuery = useCommunityPosts(community?.id ?? "");
  const searchQuery = useCommunityPostSearch(community?.id ?? "", debouncedQuery);
  const { data: posts, isLoading: postsLoading } = isSearching ? searchQuery : feedQuery;

  const [showReport, setShowReport] = useState(false);

  if (communityLoading) return <p className="py-10 text-center text-sm text-stone-400">Loading…</p>;
  if (!community)
    return <p className="py-10 text-center text-sm text-stone-400">Community not found.</p>;

  const isMember = !!community.viewer_role;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
            <Users size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-bold text-brand-ink">{community.name}</h1>
              {community.type === "restricted" && (
                <Lock size={14} className="shrink-0 text-stone-400" />
              )}
            </div>
            {community.description && (
              <p className="text-sm text-stone-500">{community.description}</p>
            )}
            <p className="mt-1 text-xs text-stone-400">
              {community.member_count} {community.member_count === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={join.isPending || leave.isPending}
              onClick={() => (isMember ? leave.mutate(community.id) : join.mutate(community.id))}
              className={
                isMember
                  ? "rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
                  : "rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-orange"
              }
            >
              {isMember ? "Leave" : "Join"}
            </button>
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Report community"
            >
              <Flag size={16} />
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <ReportDialog
          targetType="community"
          targetId={community.id}
          onClose={() => setShowReport(false)}
        />
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
          placeholder={`Search in ${community.name}…`}
          className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
      </div>

      {isMember && <PostComposer communityId={community.id} />}
      {!isMember && (
        <p className="text-center text-sm text-stone-400">Join this community to post in it.</p>
      )}

      {isSearching && query.trim().length < 2 && (
        <p className="py-8 text-center text-sm text-stone-400">
          Keep typing — search needs 2+ characters.
        </p>
      )}

      {postsLoading && <p className="py-8 text-center text-sm text-stone-400">Loading posts…</p>}
      {!postsLoading && posts?.length === 0 && isSearching && (
        <p className="py-8 text-center text-sm text-stone-400">No matching posts here.</p>
      )}
      {!postsLoading && posts?.length === 0 && !isSearching && (
        <p className="py-8 text-center text-sm text-stone-400">No posts yet — be the first 🐝</p>
      )}

      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          queryKey={
            isSearching
              ? communitySearchQueryKey(community.id, debouncedQuery)
              : communityPostsQueryKey(community.id)
          }
          mode="vote"
        />
      ))}
    </div>
  );
}
