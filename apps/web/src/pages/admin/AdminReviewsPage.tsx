import { formatRelativeTime, type ReviewStatus } from "@unibuzzz/shared";
import { useState } from "react";
import { adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { ConfirmDialog } from "../../features/admin/components/ConfirmDialog";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import {
  useAdminReviewReports,
  useAdminReviews,
  useModerateReview,
} from "../../features/admin/hooks";

function tabClasses(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold ${
    active ? "bg-brand-purple/10 text-brand-purple" : "text-stone-500 hover:bg-stone-100"
  }`;
}

function ReviewsTab() {
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [pending, setPending] = useState<{ id: string; status: ReviewStatus } | null>(null);
  const { data: reviews, isLoading } = useAdminReviews(status || undefined);
  const moderate = useModerateReview();

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as ReviewStatus | "")}
        className={adminSelectClasses}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="visible">Visible</option>
        <option value="hidden">Hidden</option>
        <option value="removed">Removed</option>
      </select>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {reviews?.map((review) => (
          <li key={review.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-ink">
                {review.rating}★ {review.title && `— ${review.title}`}
              </p>
              <p className="line-clamp-2 text-sm text-stone-600">{review.body}</p>
              <p className="mt-1 text-xs text-stone-400">
                {review.target_type} · {formatRelativeTime(review.created_at)}
                {review.flagged_pii && " · flagged: possible PII"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge status={review.status} />
              <div className="flex gap-1.5">
                {review.status !== "visible" && (
                  <button
                    type="button"
                    onClick={() => setPending({ id: review.id, status: "visible" })}
                    className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Approve
                  </button>
                )}
                {review.status !== "hidden" && (
                  <button
                    type="button"
                    onClick={() => setPending({ id: review.id, status: "hidden" })}
                    className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Hide
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
        {reviews?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No reviews found.</li>
        )}
      </ul>

      {pending && (
        <ConfirmDialog
          title={`Set review status to ${pending.status}?`}
          description="This changes what other students can see immediately."
          confirmLabel="Apply"
          destructive={pending.status === "hidden" || pending.status === "removed"}
          isPending={moderate.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() =>
            moderate.mutate(
              { reviewId: pending.id, status: pending.status },
              { onSuccess: () => setPending(null) },
            )
          }
        />
      )}
    </div>
  );
}

function ReviewReportsTab() {
  const { data: reports, isLoading } = useAdminReviewReports();

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Read-only — review reports auto-hide the review once 2+ reports are filed. Act on the review
        itself from the Reviews tab.
      </p>
      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {reports?.map((report) => (
          <li key={report.id} className="px-4 py-3">
            <p className="text-sm font-semibold text-brand-ink">
              {report.reason.replace(/_/g, " ")}
            </p>
            {report.details && <p className="text-sm text-stone-600">{report.details}</p>}
            <p className="mt-1 text-xs text-stone-400">{formatRelativeTime(report.created_at)}</p>
          </li>
        ))}
        {reports?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No review reports.</li>
        )}
      </ul>
    </div>
  );
}

export function AdminReviewsPage() {
  const [tab, setTab] = useState<"reviews" | "reports">("reviews");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Reviews</h1>
      <div className="flex w-fit gap-1 rounded-full bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setTab("reviews")}
          className={tabClasses(tab === "reviews")}
        >
          Reviews
        </button>
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={tabClasses(tab === "reports")}
        >
          Review reports
        </button>
      </div>
      {tab === "reviews" ? <ReviewsTab /> : <ReviewReportsTab />}
    </div>
  );
}
