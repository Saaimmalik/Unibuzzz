import { isAdminRole, type UserRole, type UserStatus } from "@unibuzzz/shared";
import { useState } from "react";
import { Avatar } from "../../components/Avatar";
import { AdminFilterBar, adminSelectClasses } from "../../features/admin/components/AdminFilterBar";
import { ConfirmDialog } from "../../features/admin/components/ConfirmDialog";
import { StatusBadge } from "../../features/admin/components/StatusBadge";
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from "../../features/admin/hooks";
import { useAuth } from "../../lib/auth-context";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import type { AdminUserRow } from "../../features/admin/api";

type PendingAction =
  | { kind: "role"; user: AdminUserRow; role: UserRole }
  | { kind: "status"; user: AdminUserRow; status: UserStatus };

export function AdminUsersPage() {
  const { appUser } = useAuth();
  const isAdmin = isAdminRole(appUser?.role);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const { data: users, isLoading } = useAdminUsers({
    query: debouncedQuery,
    role: role || undefined,
    status: status || undefined,
  });
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();

  function confirmLabel(action: PendingAction): string {
    if (action.kind === "role") return `Change role to ${action.role}?`;
    return `Set status to ${action.status}?`;
  }

  function runPending() {
    if (!pending) return;
    if (pending.kind === "role") {
      updateRole.mutate(
        { userId: pending.user.id, role: pending.role },
        { onSuccess: () => setPending(null) },
      );
    } else {
      updateStatus.mutate(
        { userId: pending.user.id, status: pending.status },
        { onSuccess: () => setPending(null) },
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-lg font-bold text-brand-ink">Users</h1>

      {!isAdmin && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Only admins can change roles or suspend/ban users. You can still browse.
        </p>
      )}

      <AdminFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search by name, username, email…"
      >
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | "")}
          className={adminSelectClasses}
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | "")}
          className={adminSelectClasses}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </AdminFilterBar>

      {isLoading && <p className="text-sm text-stone-400">Loading…</p>}

      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {users?.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar displayName={user.display_name} avatarUrl={user.avatar_url} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-brand-ink">{user.display_name}</p>
              <p className="truncate text-xs text-stone-500">
                @{user.username} · {user.email}
              </p>
            </div>
            <StatusBadge status={user.role} />
            <StatusBadge status={user.status} />

            {isAdmin && (
              <div className="flex shrink-0 gap-1.5">
                <select
                  value={user.role}
                  onChange={(e) =>
                    setPending({ kind: "role", user, role: e.target.value as UserRole })
                  }
                  className={adminSelectClasses}
                >
                  <option value="student">student</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
                <select
                  value={user.status}
                  onChange={(e) =>
                    setPending({ kind: "status", user, status: e.target.value as UserStatus })
                  }
                  className={adminSelectClasses}
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="banned">banned</option>
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>

      {pending && (
        <ConfirmDialog
          title={confirmLabel(pending)}
          description={`This applies to ${pending.user.display_name} (@${pending.user.username}) immediately.`}
          confirmLabel="Apply"
          destructive={pending.kind === "status" && pending.status !== "active"}
          isPending={updateRole.isPending || updateStatus.isPending}
          onCancel={() => setPending(null)}
          onConfirm={runPending}
        />
      )}
    </div>
  );
}
