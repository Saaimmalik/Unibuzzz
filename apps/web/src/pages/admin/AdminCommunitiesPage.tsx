import { isAdminRole, type CommunityStatus } from "@unibuzzz/shared";
import { useState } from "react";
import { AdminFilterBar, adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { ConfirmDialog } from "../../features/admin/components/ConfirmDialog";
import { EntitySubmissionsQueue } from "../../features/admin/components/EntitySubmissionsQueue";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import { useAdminCommunities, useModerateCommunity } from "../../features/admin/hooks";
import { useAuth } from "../../lib/auth-context";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

function tabClasses(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-semibold ${
    active ? "bg-brand-purple/10 text-brand-purple" : "text-stone-500 hover:bg-stone-100"
  }`;
}

function ActiveTab() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CommunityStatus | "">("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [pending, setPending] = useState<{ id: string; status: CommunityStatus } | null>(null);
  const { data: communities, isLoading } = useAdminCommunities({
    query: debouncedQuery,
    status: status || undefined,
  });
  const moderate = useModerateCommunity();

  return (
    <div className="space-y-3">
      <AdminFilterBar query={query} onQueryChange={setQuery} placeholder="Search community names…">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CommunityStatus | "")}
          className={adminSelectClasses}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
          <option value="removed">Removed</option>
        </select>
      </AdminFilterBar>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {communities?.map((community) => (
          <li key={community.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-brand-ink">{community.name}</p>
              <p className="text-xs text-stone-500">
                {community.type} · {community.member_count} members
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={community.status} />
              {community.status !== "locked" && (
                <button
                  type="button"
                  onClick={() => moderate.mutate({ communityId: community.id, status: "locked" })}
                  className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Lock
                </button>
              )}
              {community.status !== "removed" && (
                <button
                  type="button"
                  onClick={() => setPending({ id: community.id, status: "removed" })}
                  className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Remove
                </button>
              )}
              {community.status !== "active" && (
                <button
                  type="button"
                  onClick={() => moderate.mutate({ communityId: community.id, status: "active" })}
                  className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Restore
                </button>
              )}
            </div>
          </li>
        ))}
        {communities?.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-stone-400">No communities found.</li>
        )}
      </ul>

      {pending && (
        <ConfirmDialog
          title="Remove this community?"
          description="It will be hidden from general browsing. You can restore it later."
          confirmLabel="Remove"
          isPending={moderate.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() =>
            moderate.mutate(
              { communityId: pending.id, status: pending.status },
              { onSuccess: () => setPending(null) },
            )
          }
        />
      )}
    </div>
  );
}

export function AdminCommunitiesPage() {
  const { appUser } = useAuth();
  const [tab, setTab] = useState<"active" | "requests">("active");
  const isAdmin = isAdminRole(appUser?.role);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Communities</h1>
      <div className="flex w-fit gap-1 rounded-full bg-stone-100 p-1">
        <button type="button" onClick={() => setTab("active")} className={tabClasses(tab === "active")}>
          Active
        </button>
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={tabClasses(tab === "requests")}
        >
          Requests
        </button>
      </div>

      {tab === "active" && <ActiveTab />}
      {tab === "requests" &&
        (isAdmin ? (
          <EntitySubmissionsQueue types={["community"]} emptyLabel="No pending community requests." />
        ) : (
          <p className="text-sm text-stone-400">Only admins can approve community requests.</p>
        ))}
    </div>
  );
}
