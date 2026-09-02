import type { EntitySubmissionType } from "@unibuzzz/shared";
import { useState } from "react";
import { useEntitySubmissions, useReviewEntitySubmissionAdmin } from "../hooks";
import { ConfirmDialog } from "./ConfirmDialog";

// Generalized version of features/reviews/EntitySubmissionsPanel.tsx —
// reused by the Academics page (professor/course suggestions) and the
// Communities page's "Requests" tab (community-creation requests).
export function EntitySubmissionsQueue({
  types,
  emptyLabel = "Nothing pending.",
}: {
  types: EntitySubmissionType[];
  emptyLabel?: string;
}) {
  const { data: submissions, isLoading } = useEntitySubmissions(types);
  const reviewSubmission = useReviewEntitySubmissionAdmin();
  const [rejecting, setRejecting] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-stone-400">Loading…</p>;
  if (submissions?.length === 0) return <p className="text-sm text-stone-400">{emptyLabel}</p>;

  return (
    <div className="space-y-2">
      {submissions?.map((s) => {
        const payload = s.payload as Record<string, string>;
        return (
          <div
            key={s.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-stone-400">{s.type}</p>
              {s.type === "professor" && (
                <p className="text-sm text-brand-ink">
                  {payload.first_name} {payload.last_name} · {payload.department}
                </p>
              )}
              {s.type === "course" && (
                <p className="text-sm text-brand-ink">
                  {payload.code} — {payload.title} · {payload.department}
                </p>
              )}
              {s.type === "community" && (
                <div>
                  <p className="text-sm text-brand-ink">
                    {payload.name} · {payload.type}
                  </p>
                  {payload.description && (
                    <p className="text-xs text-stone-500">{payload.description}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => reviewSubmission.mutate({ submissionId: s.id, decision: "approve" })}
                disabled={reviewSubmission.isPending}
                className="rounded-lg bg-brand-yellow px-2.5 py-1 text-xs font-semibold text-black hover:bg-brand-orange disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setRejecting(s.id)}
                disabled={reviewSubmission.isPending}
                className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
              >
                Reject
              </button>
            </div>

            {rejecting === s.id && (
              <ConfirmDialog
                title="Reject this request?"
                description="The submitter won't be notified automatically. This can't be undone."
                confirmLabel="Reject"
                isPending={reviewSubmission.isPending}
                onCancel={() => setRejecting(null)}
                onConfirm={() =>
                  reviewSubmission.mutate(
                    { submissionId: s.id, decision: "reject" },
                    { onSuccess: () => setRejecting(null) },
                  )
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
