import { formatRelativeTime, type ReportStatus, type ReportTargetType } from "@unibuzzz/shared";
import { useState } from "react";
import { adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { ConfirmDialog } from "../../features/admin/components/ConfirmDialog";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import { useAdminReports, useResolveReport } from "../../features/admin/hooks";

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus | "">("pending");
  const [targetType, setTargetType] = useState<ReportTargetType | "">("");
  const [resolving, setResolving] = useState<{
    id: string;
    decision: "resolved" | "dismissed";
  } | null>(null);
  const { data: reports, isLoading } = useAdminReports({
    status: status || undefined,
    targetType: targetType || undefined,
  });
  const resolve = useResolveReport();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Reports</h1>

      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReportStatus | "")}
          className={adminSelectClasses}
        >
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="">All statuses</option>
        </select>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as ReportTargetType | "")}
          className={adminSelectClasses}
        >
          <option value="">All types</option>
          <option value="post">Posts</option>
          <option value="comment">Comments</option>
          <option value="listing">Listings</option>
          <option value="message">Messages</option>
          <option value="community">Communities</option>
          <option value="user">Users</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {reports?.map((report) => (
          <li key={report.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold capitalize text-brand-ink">
                {report.target_type} · {report.reason.replace(/_/g, " ")}
              </p>
              {report.details && <p className="text-sm text-stone-600">{report.details}</p>}
              <p className="mt-1 text-xs text-stone-400">
                {formatRelativeTime(report.created_at)}
                {report.resolution_note && ` · note: ${report.resolution_note}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={report.status} />
              {report.status === "pending" && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResolving({ id: report.id, decision: "resolved" })}
                    className="rounded-lg bg-brand-yellow px-2.5 py-1 text-xs font-semibold text-black hover:bg-brand-orange"
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolving({ id: report.id, decision: "dismissed" })}
                    className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
        {reports?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No reports found.</li>
        )}
      </ul>

      {resolving && (
        <ConfirmDialog
          title={
            resolving.decision === "resolved"
              ? "Mark this report resolved?"
              : "Dismiss this report?"
          }
          description={
            resolving.decision === "resolved"
              ? "Mark this as handled. If the content itself needs removing, do that from its own admin page first."
              : "This report won't need further action."
          }
          confirmLabel={resolving.decision === "resolved" ? "Resolve" : "Dismiss"}
          destructive={false}
          isPending={resolve.isPending}
          onCancel={() => setResolving(null)}
          onConfirm={() =>
            resolve.mutate(
              { reportId: resolving.id, decision: resolving.decision, note: null },
              { onSuccess: () => setResolving(null) },
            )
          }
        />
      )}
    </div>
  );
}
