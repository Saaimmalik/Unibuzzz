import { formatRelativeTime, type FeedbackStatus } from "@unibuzzz/shared";
import { useState } from "react";
import { adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import { useAdminFeedback, useUpdateFeedbackStatus } from "../../features/admin/hooks";

const TYPE_LABELS: Record<string, string> = {
  feature_request: "Feature request",
  bug_report: "Bug report",
};

export function AdminFeedbackPage() {
  const [status, setStatus] = useState<FeedbackStatus | "">("open");
  const { data: feedback, isLoading } = useAdminFeedback(status || undefined);
  const updateStatus = useUpdateFeedbackStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Feedback</h1>

      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FeedbackStatus | "")}
          className={adminSelectClasses}
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="">All statuses</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {feedback?.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple">
                  {TYPE_LABELS[item.type] ?? item.type}
                </p>
                <p className="text-sm font-semibold text-brand-ink">{item.subject}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{item.body}</p>
                <p className="mt-1 text-xs text-stone-400">{formatRelativeTime(item.created_at)}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["open", "in_progress", "resolved", "closed"] as FeedbackStatus[])
                .filter((s) => s !== item.status)
                .map((next) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() =>
                      updateStatus.mutate({
                        feedbackId: item.id,
                        status: next,
                        adminNote: item.admin_note,
                      })
                    }
                    disabled={updateStatus.isPending}
                    className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
                  >
                    Mark {next.replace("_", " ")}
                  </button>
                ))}
            </div>
          </li>
        ))}
        {feedback?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No feedback found.</li>
        )}
      </ul>
    </div>
  );
}
