import { formatRelativeTime } from "@unibuzzz/shared";
import { Flag, GraduationCap, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminOverview } from "../../features/admin/hooks";

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Flag;
  label: string;
  value: number;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 hover:border-brand-purple/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10 text-brand-purple">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-brand-ink">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </Link>
  );
}

export function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-lg font-bold text-brand-ink">Overview</h1>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={Flag}
              label="Pending reports"
              value={data.pendingReports}
              to="/admin/reports"
            />
            <StatCard
              icon={UsersRound}
              label="Community requests"
              value={data.pendingCommunityRequests}
              to="/admin/communities"
            />
            <StatCard
              icon={GraduationCap}
              label="Academic suggestions"
              value={data.pendingAcademicSubmissions}
              to="/admin/academics"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-500">Recent activity</h2>
              <Link to="/admin/audit-log" className="text-xs font-medium text-brand-purple">
                View full log
              </Link>
            </div>
            {data.recentAuditLog.length === 0 ? (
              <p className="text-sm text-stone-400">No moderation activity yet.</p>
            ) : (
              <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
                {data.recentAuditLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="text-brand-ink">{entry.action.replace(/_/g, " ")}</span>
                    <span className="shrink-0 text-xs text-stone-400">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
