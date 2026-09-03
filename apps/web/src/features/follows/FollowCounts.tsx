export function FollowCounts({
  followerCount,
  followingCount,
  onShowFollowers,
  onShowFollowing,
}: {
  followerCount: number;
  followingCount: number;
  onShowFollowers: () => void;
  onShowFollowing: () => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-4 text-sm">
      <button type="button" onClick={onShowFollowers} className="hover:underline">
        <span className="font-bold text-brand-ink">{followerCount}</span>{" "}
        <span className="text-stone-500">{followerCount === 1 ? "follower" : "followers"}</span>
      </button>
      <button type="button" onClick={onShowFollowing} className="hover:underline">
        <span className="font-bold text-brand-ink">{followingCount}</span>{" "}
        <span className="text-stone-500">following</span>
      </button>
    </div>
  );
}
