import { useParams } from "react-router-dom";
import { PostCard } from "../features/feed/PostCard";
import { postQueryKey, usePost } from "../features/feed/hooks";

export function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { data: post, isLoading, isError } = usePost(postId!);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      {isLoading && <p className="py-8 text-center text-sm text-stone-400">Loading post…</p>}
      {isError && (
        <p className="py-8 text-center text-sm text-red-600">
          Couldn't load this post. Try refreshing.
        </p>
      )}
      {!isLoading && !isError && !post && (
        <p className="py-8 text-center text-sm text-stone-400">
          This post isn't available — it may have been removed.
        </p>
      )}

      {post && (
        <PostCard
          post={post}
          queryKey={postQueryKey(post.id)}
          mode={post.community_id ? "vote" : "like"}
          defaultShowComments
        />
      )}
    </div>
  );
}
