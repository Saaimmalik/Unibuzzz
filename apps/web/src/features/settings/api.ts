import type { WhoCanMessage } from "@unibuzzz/shared";
import { supabase } from "../../lib/supabase";

export type EmailPreferences = {
  email_pref_comments: boolean;
  email_pref_likes: boolean;
  email_pref_messages: boolean;
  email_pref_community: boolean;
  email_pref_marketplace: boolean;
  email_pref_reviews: boolean;
  email_pref_announcements: boolean;
};

export async function updateEmailPreferences(
  userId: string,
  prefs: Partial<EmailPreferences>,
): Promise<void> {
  const { error } = await supabase.from("users").update(prefs).eq("id", userId);
  if (error) throw error;
}

export type PrivacySettings = {
  who_can_message: WhoCanMessage;
  hide_follow_counts: boolean;
};

export async function updatePrivacySettings(
  userId: string,
  settings: Partial<PrivacySettings>,
): Promise<void> {
  const { error } = await supabase.from("users").update(settings).eq("id", userId);
  if (error) throw error;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function deactivateAccount(): Promise<void> {
  const { error } = await supabase.rpc("deactivate_own_account");
  if (error) throw error;
}

export async function reactivateAccount(): Promise<void> {
  const { error } = await supabase.rpc("reactivate_own_account");
  if (error) throw error;
}

// Two elevated-privilege steps (permanently banning the auth account,
// cleaning up the avatar file) that can't go through an RLS-scoped client
// call — see supabase/functions/delete-account. The DB-side anonymization
// itself (delete_own_account RPC) is called *inside* that function, using
// the same JWT this request already carries, not here — keeps it one round
// trip instead of two, and one place that can fail atomically-ish.
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
  if (error) throw error;
}

// Fetches the full export from the export-data edge function and triggers
// an immediate browser download — the "synchronous in-browser export"
// approach, no emailed link / background job.
export async function downloadMyData(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const { data, error } = await supabase.functions.invoke("export-data", { method: "POST" });
  if (error) throw error;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "unibuzzz-data-export.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
