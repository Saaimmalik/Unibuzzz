import { useState } from "react";
import { SettingsCard, SettingsSubpageHeader, ToggleRow } from "../../features/settings/SettingsUI";
import { useUpdateEmailPreferences } from "../../features/settings/hooks";
import { useAuth } from "../../lib/auth-context";

type EmailPrefKey =
  | "email_pref_comments"
  | "email_pref_likes"
  | "email_pref_messages"
  | "email_pref_community"
  | "email_pref_marketplace"
  | "email_pref_reviews"
  | "email_pref_announcements";

const EMAIL_PREF_ROWS: { key: EmailPrefKey; label: string; description: string }[] = [
  {
    key: "email_pref_comments",
    label: "Comments & replies",
    description: "When someone comments on your post",
  },
  { key: "email_pref_likes", label: "Likes", description: "When someone likes your post" },
  {
    key: "email_pref_messages",
    label: "Messages",
    description: "When you get a new direct message",
  },
  {
    key: "email_pref_community",
    label: "Community requests & updates",
    description: "Approvals, rejections, and updates on communities you're involved with",
  },
  {
    key: "email_pref_marketplace",
    label: "Marketplace activity",
    description: "Messages about your listings, and moderation updates",
  },
  {
    key: "email_pref_reviews",
    label: "Review activity",
    description: "Helpful votes and moderation updates on your reviews",
  },
  {
    key: "email_pref_announcements",
    label: "UniBuzzz announcements",
    description: "Occasional important announcements from the UniBuzzz team",
  },
];

export function EmailPreferencesPage() {
  const { appUser } = useAuth();
  const updateEmailPreferences = useUpdateEmailPreferences();

  const [emailPrefs, setEmailPrefs] = useState(() => ({
    email_pref_comments: appUser?.email_pref_comments ?? false,
    email_pref_likes: appUser?.email_pref_likes ?? false,
    email_pref_messages: appUser?.email_pref_messages ?? false,
    email_pref_community: appUser?.email_pref_community ?? false,
    email_pref_marketplace: appUser?.email_pref_marketplace ?? false,
    email_pref_reviews: appUser?.email_pref_reviews ?? false,
    email_pref_announcements: appUser?.email_pref_announcements ?? false,
  }));

  function toggleEmailPref(key: EmailPrefKey, next: boolean) {
    setEmailPrefs((prev) => ({ ...prev, [key]: next }));
    updateEmailPreferences.mutate({ [key]: next });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <SettingsSubpageHeader title="Email preferences" backTo="/settings" />

      <SettingsCard description="Choose which activity you get emailed about, in addition to in-app notifications.">
        <div className="divide-y divide-stone-100">
          <ToggleRow
            label="Security & verification"
            description="Sign-in, password reset, and email verification — required, can't be turned off"
            checked={true}
            onChange={() => {}}
            disabled
          />
          {EMAIL_PREF_ROWS.map(({ key, label, description }) => (
            <ToggleRow
              key={key}
              label={label}
              description={description}
              checked={emailPrefs[key]}
              onChange={(next) => toggleEmailPref(key, next)}
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}
