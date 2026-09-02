import { zodResolver } from "@hookform/resolvers/zod";
import { createCommentSchema, formatRelativeTime, type CreateCommentInput } from "@unibuzzz/shared";
import { Flag } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../lib/auth-context";
import { ReportDialog } from "../reports/ReportDialog";
import { useComments, useCreateComment } from "./hooks";

export function CommentSection({ postId }: { postId: string }) {
  const { appUser } = useAuth();
  const { data: comments, isLoading } = useComments(postId, true);
  const createComment = useCreateComment(postId);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateCommentInput>({ resolver: zodResolver(createCommentSchema) });

  async function onSubmit(values: CreateCommentInput) {
    await createComment.mutateAsync(values.body);
    reset();
  }

  return (
    <div className="border-t border-stone-100 bg-stone-50 px-4 py-3">
      {isLoading && <p className="text-xs text-stone-400">Loading comments…</p>}

      <ul className="space-y-2">
        {comments?.map((comment) => (
          <li key={comment.id} className="flex gap-2 text-sm">
            <Avatar
              displayName={comment.author.display_name}
              avatarUrl={comment.author.avatar_url}
              size="sm"
            />
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 rounded-xl bg-white px-3 py-1.5">
              <div className="min-w-0">
                <span className="font-semibold text-brand-ink">{comment.author.display_name}</span>{" "}
                <span className="text-stone-500">· {formatRelativeTime(comment.created_at)}</span>
                <p className="text-brand-ink">{comment.body}</p>
              </div>
              {comment.author_id !== appUser?.id && (
                <button
                  type="button"
                  onClick={() => setReportingCommentId(comment.id)}
                  className="shrink-0 rounded-full p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                  aria-label="Report comment"
                >
                  <Flag size={13} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {reportingCommentId && (
        <ReportDialog
          targetType="comment"
          targetId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex gap-2">
        <Avatar
          displayName={appUser?.display_name ?? "?"}
          avatarUrl={appUser?.avatar_url}
          size="sm"
        />
        <input
          type="text"
          placeholder="Write a comment…"
          className="w-full rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
          {...register("body")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="shrink-0 rounded-full bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand-orange disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
