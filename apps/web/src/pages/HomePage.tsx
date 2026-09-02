import { PostCard } from "../features/feed/PostCard";
import { PostComposer } from "../features/feed/PostComposer";
import { usePostsFeed } from "../features/feed/hooks";

export function HomePage() {
  const { data: posts, isLoading, isError } = usePostsFeed();

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      <PostComposer />

      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading feed…</p>}
      {isError && (
        <p className="py-8 text-center text-sm text-red-600">
          Couldn't load the feed. Try refreshing.
        </p>
      )}

      {posts && posts.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-400">
          No posts yet — be the first to say something 🐝
        </p>
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
