import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { useFollowers, useFollowing } from "./hooks";

export function FollowListModal({
  userId,
  mode,
  onClose,
}: {
  userId: string;
  mode: "followers" | "following";
  onClose: () => void;
}) {
  const followersQuery = useFollowers(mode === "followers" ? userId : undefined);
  const followingQuery = useFollowing(mode === "following" ? userId : undefined);
  const { data: users, isLoading } = mode === "followers" ? followersQuery : followingQuery;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-brand-ink">
            {mode === "followers" ? "Followers" : "Following"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading && <p className="py-6 text-center text-sm text-stone-400">Loading…</p>}
        {!isLoading && users?.length === 0 && (
          <p className="py-6 text-center text-sm text-stone-400">
            {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        )}

        <div className="space-y-1">
          {users?.map((user) => (
            <Link
              key={user.id}
              to={`/u/${user.username}`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-50"
            >
              <Avatar displayName={user.display_name} avatarUrl={user.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-ink">
                  {user.display_name}
                </p>
                <p className="truncate text-xs text-stone-500">@{user.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
