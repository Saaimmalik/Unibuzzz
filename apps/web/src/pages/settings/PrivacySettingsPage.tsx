import type { WhoCanMessage } from "@unibuzzz/shared";
import { useState } from "react";
import { AuthField, authInputClasses } from "../../components/AuthLayout";
import { SettingsCard, SettingsSubpageHeader, ToggleRow } from "../../features/settings/SettingsUI";
import { useUpdatePrivacySettings } from "../../features/settings/hooks";
import { useAuth } from "../../lib/auth-context";

export function PrivacySettingsPage() {
  const { appUser } = useAuth();
  const updatePrivacySettings = useUpdatePrivacySettings();

  const [whoCanMessage, setWhoCanMessage] = useState<WhoCanMessage>(
    appUser?.who_can_message ?? "everyone",
  );
  const [hideFollowCounts, setHideFollowCounts] = useState(appUser?.hide_follow_counts ?? false);

  function changeWhoCanMessage(next: WhoCanMessage) {
    setWhoCanMessage(next);
    updatePrivacySettings.mutate({ who_can_message: next });
  }

  function toggleHideFollowCounts(next: boolean) {
    setHideFollowCounts(next);
    updatePrivacySettings.mutate({ hide_follow_counts: next });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <SettingsSubpageHeader title="Privacy" backTo="/settings" />

      <SettingsCard title="Messaging">
        <AuthField label="Who can message you">
          <select
            className={authInputClasses}
            value={whoCanMessage}
            onChange={(e) => changeWhoCanMessage(e.target.value as WhoCanMessage)}
          >
            <option value="everyone">Everyone at my university</option>
            <option value="following">Only people I follow</option>
            <option value="nobody">No one</option>
          </select>
        </AuthField>
      </SettingsCard>

      <SettingsCard title="Profile">
        <div className="divide-y divide-stone-100">
          <ToggleRow
            label="Hide follower/following counts"
            description="Hide your counts and lists from other students on your profile"
            checked={hideFollowCounts}
            onChange={toggleHideFollowCounts}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
