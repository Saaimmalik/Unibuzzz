import { Lock, Users } from "lucide-react";
import { useParams } from "react-router-dom";
import { PostCard } from "../features/feed/PostCard";
import { PostComposer } from "../features/feed/PostComposer";
import { communityPostsQueryKey } from "../features/feed/api";
import {
  useCommunity,
  useCommunityPosts,
  useJoinCommunity,
  useLeaveCommunity,
} from "../features/communities/hooks";

export function CommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: community, isLoading: communityLoading } = useCommunity(slug ?? "");
  const join = useJoinCommunity(slug ?? "");
  const leave = useLeaveCommunity(slug ?? "");
  const { data: posts, isLoading: postsLoading } = useCommunityPosts(community?.id ?? "");

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
          <button
            type="button"
            disabled={join.isPending || leave.isPending}
            onClick={() => (isMember ? leave.mutate(community.id) : join.mutate(community.id))}
            className={
              isMember
                ? "shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
                : "shrink-0 rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-brand-ink hover:bg-brand-orange"
            }
          >
            {isMember ? "Leave" : "Join"}
          </button>
        </div>
      </div>

      {isMember && <PostComposer communityId={community.id} />}
      {!isMember && (
        <p className="text-center text-sm text-stone-400">Join this community to post in it.</p>
      )}

      {postsLoading && <p className="py-8 text-center text-sm text-stone-400">Loading posts…</p>}
      {!postsLoading && posts?.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">No posts yet — be the first 🐝</p>
      )}

      {posts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          queryKey={communityPostsQueryKey(community.id)}
          mode="vote"
        />
      ))}
    </div>
  );
}
