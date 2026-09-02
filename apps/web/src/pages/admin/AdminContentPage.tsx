import { formatRelativeTime } from "@unibuzzz/shared";
import { useState } from "react";
import { AdminFilterBar, adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { ConfirmDialog } from "../../features/admin/components/ConfirmDialog";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import {
  useAdminComments,
  useAdminPosts,
  useModerateComment,
  useModeratePost,
} from "../../features/admin/hooks";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

function tabClasses(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold ${
    active ? "bg-brand-purple/10 text-brand-purple" : "text-stone-500 hover:bg-stone-100"
  }`;
}

function PostsTab() {
  const [query, setQuery] = useState("");
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data: posts, isLoading } = useAdminPosts({ query: debouncedQuery, includeRemoved });
  const moderate = useModeratePost();

  return (
    <div className="space-y-3">
      <AdminFilterBar query={query} onQueryChange={setQuery} placeholder="Search post text…">
        <select
          value={includeRemoved ? "all" : "active"}
          onChange={(e) => setIncludeRemoved(e.target.value === "all")}
          className={adminSelectClasses}
        >
          <option value="active">Active only</option>
          <option value="all">Include removed</option>
        </select>
      </AdminFilterBar>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {posts?.map((post) => (
          <li key={post.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm text-brand-ink">{post.body}</p>
              <p className="mt-1 text-xs text-stone-400">
                @{post.author.username} · {formatRelativeTime(post.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={post.deleted_at ? "removed" : "active"} />
              <button
                type="button"
                onClick={() =>
                  post.deleted_at
                    ? moderate.mutate({ postId: post.id, deletedAt: null })
                    : setConfirmingId(post.id)
                }
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                {post.deleted_at ? "Restore" : "Remove"}
              </button>
            </div>

            {confirmingId === post.id && (
              <ConfirmDialog
                title="Remove this post?"
                description="It will be hidden from the feed. You can restore it later."
                confirmLabel="Remove"
                isPending={moderate.isPending}
                onCancel={() => setConfirmingId(null)}
                onConfirm={() =>
                  moderate.mutate(
                    { postId: post.id, deletedAt: new Date().toISOString() },
                    { onSuccess: () => setConfirmingId(null) },
                  )
                }
              />
            )}
          </li>
        ))}
        {posts?.length === 0 && <li className="px-4 py-6 text-center text-sm text-stone-400">No posts found.</li>}
      </ul>
    </div>
  );
}

function CommentsTab() {
  const [query, setQuery] = useState("");
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data: comments, isLoading } = useAdminComments({ query: debouncedQuery, includeRemoved });
  const moderate = useModerateComment();

  return (
    <div className="space-y-3">
      <AdminFilterBar query={query} onQueryChange={setQuery} placeholder="Search comment text…">
        <select
          value={includeRemoved ? "all" : "active"}
          onChange={(e) => setIncludeRemoved(e.target.value === "all")}
          className={adminSelectClasses}
        >
          <option value="active">Active only</option>
          <option value="all">Include removed</option>
        </select>
      </AdminFilterBar>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {comments?.map((comment) => (
          <li key={comment.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm text-brand-ink">{comment.body}</p>
              <p className="mt-1 text-xs text-stone-400">
                @{comment.author.username} · {formatRelativeTime(comment.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={comment.deleted_at ? "removed" : "active"} />
              <button
                type="button"
                onClick={() =>
                  comment.deleted_at
                    ? moderate.mutate({ commentId: comment.id, deletedAt: null })
                    : setConfirmingId(comment.id)
                }
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                {comment.deleted_at ? "Restore" : "Remove"}
              </button>
            </div>

            {confirmingId === comment.id && (
              <ConfirmDialog
                title="Remove this comment?"
                description="It will be hidden. You can restore it later."
                confirmLabel="Remove"
                isPending={moderate.isPending}
                onCancel={() => setConfirmingId(null)}
                onConfirm={() =>
                  moderate.mutate(
                    { commentId: comment.id, deletedAt: new Date().toISOString() },
                    { onSuccess: () => setConfirmingId(null) },
                  )
                }
              />
            )}
          </li>
        ))}
        {comments?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No comments found.</li>
        )}
      </ul>
    </div>
  );
}

export function AdminContentPage() {
  const [tab, setTab] = useState<"posts" | "comments">("posts");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Content</h1>
      <div className="flex gap-1 rounded-full bg-stone-100 p-1 w-fit">
        <button type="button" onClick={() => setTab("posts")} className={tabClasses(tab === "posts")}>
          Posts
        </button>
        <button type="button" onClick={() => setTab("comments")} className={tabClasses(tab === "comments")}>
          Comments
        </button>
      </div>
      {tab === "posts" ? <PostsTab /> : <CommentsTab />}
    </div>
  );
}
