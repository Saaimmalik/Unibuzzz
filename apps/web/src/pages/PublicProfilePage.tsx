import { useQuery } from "@tanstack/react-query";
import { Flag, MessageCircle, ShieldBan, ShieldOff, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { useBlockUser, useIsBlocked, useUnblockUser } from "../features/blocking/hooks";
import { PostCard } from "../features/feed/PostCard";
import { FollowCounts } from "../features/follows/FollowCounts";
import { FollowListModal } from "../features/follows/FollowListModal";
import { useIsFollowing, useToggleFollow } from "../features/follows/hooks";
import { useStartConversation } from "../features/messaging/hooks";
import { useUserPosts } from "../features/profile/hooks";
import { ReportDialog } from "../features/reports/ReportDialog";
import { fetchUserByUsername } from "../features/search/api";
import { useAuth } from "../lib/auth-context";

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const startConversation = useStartConversation();
  const [messageError, setMessageError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-by-username", username],
    queryFn: () => fetchUserByUsername(username!),
    enabled: !!username,
  });
  const {
    posts,
    isLoading: postsLoading,
    hasMore,
    loadMore,
    isFetching,
    queryKey: postsQueryKey,
  } = useUserPosts(user?.id);
  const { data: isFollowing, isLoading: isFollowingLoading } = useIsFollowing(user?.id);
  const toggleFollow = useToggleFollow(user?.id ?? "");
  const { data: isBlocked } = useIsBlocked(user?.id);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  if (username && appUser?.username === username) return <Navigate to="/profile" replace />;
  if (isLoading) return <p className="py-10 text-center text-sm text-stone-400">Loading…</p>;
  if (!user) return <p className="py-10 text-center text-sm text-stone-400">User not found.</p>;

  async function handleMessage() {
    setMessageError(null);
    try {
      const conversationId = await startConversation.mutateAsync(user!.id);
      navigate(`/messages/${conversationId}`);
    } catch {
      setMessageError("Couldn't start a conversation. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar displayName={user.display_name} avatarUrl={user.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-brand-ink">{user.display_name}</h1>
          <p className="text-sm text-stone-500">@{user.username}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleFollow.mutate(!!isFollowing)}
            disabled={toggleFollow.isPending || isFollowingLoading}
            className={
              isFollowing
                ? "flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
                : "flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-purple-light disabled:opacity-60"
            }
          >
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {isFollowing ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            onClick={handleMessage}
            disabled={startConversation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-black hover:bg-brand-orange disabled:opacity-60"
          >
            <MessageCircle size={16} />
            Message
          </button>
          <button
            type="button"
            onClick={() => (isBlocked ? unblockUser.mutate(user!.id) : blockUser.mutate(user!.id))}
            disabled={blockUser.isPending || unblockUser.isPending}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-60"
            aria-label={isBlocked ? "Unblock user" : "Block user"}
            title={isBlocked ? "Unblock user" : "Block user"}
          >
            {isBlocked ? <ShieldOff size={16} /> : <ShieldBan size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Report user"
          >
            <Flag size={16} />
          </button>
        </div>
      </div>

      {!user.hide_follow_counts && (
        <FollowCounts
          followerCount={user.follower_count}
          followingCount={user.following_count}
          onShowFollowers={() => setFollowModal("followers")}
          onShowFollowing={() => setFollowModal("following")}
        />
      )}

      {followModal && (
        <FollowListModal userId={user.id} mode={followModal} onClose={() => setFollowModal(null)} />
      )}

      {messageError && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {messageError}
        </p>
      )}

      {showReport && (
        <ReportDialog targetType="user" targetId={user.id} onClose={() => setShowReport(false)} />
      )}

      <dl className="mt-8 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        <div className="flex justify-between px-4 py-3 text-sm">
          <dt className="text-stone-500">Degree</dt>
          <dd className="font-medium text-brand-ink">{user.degree ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-brand-ink">Posts</h2>
        {postsLoading && <p className="py-8 text-center text-sm text-stone-400">Loading posts…</p>}
        {!postsLoading && posts.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400">No posts yet.</p>
        )}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} queryKey={postsQueryKey} />
          ))}
        </div>
        {hasMore && posts.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isFetching}
            className="mt-4 w-full rounded-lg border border-stone-300 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            {isFetching ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
