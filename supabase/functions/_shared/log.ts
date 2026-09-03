import { createClient } from "npm:@supabase/supabase-js@2";

// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
// deployed edge function's environment by Supabase — not something to set
// by hand (see supabase/functions/.env.example). Service role bypasses RLS,
// which is required here: email_log has no client INSERT policy at all,
// same "only a trusted server-side path can write this" convention as
// public.create_notification in the main schema.
function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logEmail(entry: {
  category: "auth" | "app";
  event_type: string;
  recipient_email: string;
  status: "sent" | "failed";
  error_message?: string | null;
  provider_message_id?: string | null;
}): Promise<void> {
  // Logging must never throw into (or delay) the caller's response — this is
  // best-effort observability, not part of the send path's correctness.
  try {
    const client = serviceClient();
    if (!client) {
      console.error("logEmail: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing, skipping DB log", entry);
      return;
    }
    const { error } = await client.from("email_log").insert(entry);
    if (error) {
      console.error("logEmail: insert failed", error.message, entry);
    }
  } catch (err) {
    console.error("logEmail: unexpected error", err);
  }
}
