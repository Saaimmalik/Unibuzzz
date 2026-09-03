import { Avatar } from "../../components/Avatar";
import { useBlockedUsers, useUnblockUser } from "../../features/blocking/hooks";
import { SettingsCard, SettingsSubpageHeader } from "../../features/settings/SettingsUI";

export function BlockedUsersPage() {
  const { data: blockedUsers, isLoading } = useBlockedUsers();
  const unblockUser = useUnblockUser();

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <SettingsSubpageHeader title="Blocked users" backTo="/settings" />

      <SettingsCard
        title="Blocked users"
        description="Blocked users can't message you or see your posts and comments, and you won't see theirs."
      >
        {isLoading && <p className="text-sm text-stone-400">Loading…</p>}
        {!isLoading && (blockedUsers?.length ?? 0) === 0 && (
          <p className="text-sm text-stone-400">You haven't blocked anyone.</p>
        )}
        <ul className="divide-y divide-stone-100">
          {blockedUsers?.map((row) => (
            <li key={row.blocked_id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar
                  displayName={row.blocked.display_name}
                  avatarUrl={row.blocked.avatar_url}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-ink">
                    {row.blocked.display_name}
                  </p>
                  <p className="truncate text-xs text-stone-500">@{row.blocked.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => unblockUser.mutate(row.blocked_id)}
                disabled={unblockUser.isPending}
                className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </div>
  );
}
