import { formatRelativeTime } from "@unibuzzz/shared";
import type { QueryKey } from "@tanstack/react-query";
import { ArrowBigDown, ArrowBigUp, Flag, Heart, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../lib/auth-context";
import { ReportDialog } from "../reports/ReportDialog";
import { CommentSection } from "./CommentSection";
import { useDeletePost, useSetPostReaction, useToggleLike } from "./hooks";
import { POSTS_QUERY_KEY, type FeedPost } from "./api";

export function PostCard({
  post,
  queryKey = POSTS_QUERY_KEY,
  mode = "like",
  defaultShowComments = false,
}: {
  post: FeedPost;
  queryKey?: QueryKey;
  mode?: "like" | "vote";
  defaultShowComments?: boolean;
}) {
  const { appUser } = useAuth();
  const toggleLike = useToggleLike(queryKey);
  const vote = useSetPostReaction(queryKey);
  const deletePost = useDeletePost(queryKey);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showReport, setShowReport] = useState(false);

  const isOwnPost = post.author_id === appUser?.id;
  const isLiked = post.viewer_reaction === "like";

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex gap-3">
          <Avatar displayName={post.author.display_name} avatarUrl={post.author.avatar_url} />
          <div>
            <p className="text-sm font-semibold text-brand-ink">{post.author.display_name}</p>
            <p className="text-xs text-stone-500">
              @{post.author.username} · {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </div>

        {isOwnPost ? (
          <button
            type="button"
            onClick={() => deletePost.mutate(post.id)}
            className="rounded-full p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete post"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Report post"
          >
            <Flag size={16} />
          </button>
        )}
      </div>

      {showReport && (
        <ReportDialog targetType="post" targetId={post.id} onClose={() => setShowReport(false)} />
      )}

      <p className="whitespace-pre-wrap px-4 pb-3 text-sm text-brand-ink">{post.body}</p>

      {post.post_media.map(
        (media) =>
          media.signedUrl && (
            <img
              key={media.id}
              src={media.signedUrl}
              alt=""
              className="max-h-96 w-full object-cover"
            />
          ),
      )}

      <div className="flex items-center gap-4 border-t border-stone-100 px-4 py-2">
        {mode === "like" ? (
          <button
            type="button"
            onClick={() => toggleLike.mutate(post)}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors ${
              isLiked ? "text-red-600" : "text-stone-500 hover:text-red-600"
            }`}
          >
            <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            {post.like_count}
          </button>
        ) : (
          <div className="flex items-center gap-1 rounded-lg bg-stone-50 px-1">
            <button
              type="button"
              onClick={() => vote.mutate({ post, type: "upvote" })}
              className={`rounded-md p-1 transition-colors ${
                post.viewer_reaction === "upvote"
                  ? "text-brand-orange"
                  : "text-stone-400 hover:text-brand-orange"
              }`}
              aria-label="Upvote"
            >
              <ArrowBigUp
                size={20}
                fill={post.viewer_reaction === "upvote" ? "currentColor" : "none"}
              />
            </button>
            <span className="min-w-4 text-center text-sm font-semibold text-brand-ink">
              {post.like_count}
            </span>
            <button
              type="button"
              onClick={() => vote.mutate({ post, type: "downvote" })}
              className={`rounded-md p-1 transition-colors ${
                post.viewer_reaction === "downvote"
                  ? "text-brand-purple"
                  : "text-stone-400 hover:text-brand-purple"
              }`}
              aria-label="Downvote"
            >
              <ArrowBigDown
                size={20}
                fill={post.viewer_reaction === "downvote" ? "currentColor" : "none"}
              />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-stone-500 hover:text-brand-purple"
        >
          <MessageCircle size={18} />
          {post.comment_count}
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} />}
    </article>
  );
}
