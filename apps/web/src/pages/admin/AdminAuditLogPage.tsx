import { formatRelativeTime } from "@unibuzzz/shared";
import { useState } from "react";
import { adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { useAuditLog } from "../../features/admin/hooks";

const TARGET_TYPES = ["user", "post", "comment", "review", "listing", "community"] as const;

export function AdminAuditLogPage() {
  const [targetType, setTargetType] = useState<string>("");
  const { data: entries, isLoading } = useAuditLog(targetType || undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Audit log</h1>
      <p className="text-sm text-stone-500">
        Every moderation action, append-only — who did what, to what, and when.
      </p>

      <select
        value={targetType}
        onChange={(e) => setTargetType(e.target.value)}
        className={adminSelectClasses}
      >
        <option value="">All types</option>
        {TARGET_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {entries?.map((entry) => (
          <li key={entry.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-brand-ink">
                {entry.action.replace(/_/g, " ")}
              </p>
              <p className="shrink-0 text-xs text-stone-400">
                {formatRelativeTime(entry.created_at)}
              </p>
            </div>
            <p className="text-xs text-stone-500">
              target: {entry.target_type}
              {entry.reason && ` · ${entry.reason}`}
            </p>
          </li>
        ))}
        {entries?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No activity yet.</li>
        )}
      </ul>
    </div>
  );
}
