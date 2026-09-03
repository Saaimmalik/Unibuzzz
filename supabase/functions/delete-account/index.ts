// Called by the frontend (Settings → Delete account) after the user has
// typed the confirmation phrase. Does the two things that genuinely need
// elevated privilege beyond what an RLS-scoped RPC can do:
//   1. Permanently bans the Supabase Auth user (admin.updateUserById with a
//      ~100-year ban_duration) so login is blocked forever.
//   2. Best-effort deletes their avatar file from storage.
//
// Deliberately does NOT call auth.admin.deleteUser(): public.users.
// auth_user_id references auth.users(id) ON DELETE CASCADE, which would
// cascade-delete the users row and, from there, every posts/comments/
// reviews/listings row that references it via author_id/seller_id/
// reviewer_id ON DELETE CASCADE — silently hard-deleting all of a student's
// content, which directly contradicts the founder's chosen "anonymize, keep
// content in place" deletion behavior. Banning achieves "this person can
// never log in again" without touching that row at all.
//
// The actual profile anonymization (display name/username/email/bio/avatar
// scrub, status='deleted') happens via the delete_own_account() RPC, called
// here using the caller's own JWT (not the service role) so the
// self-service status-transition check in prevent_protected_user_field_changes
// evaluates correctly.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("delete-account: missing SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const asAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authUserId = userData.user.id;

  const { data: appUser } = await asUser
    .from("users")
    .select("id, university_id")
    .eq("auth_user_id", authUserId)
    .single();

  // Anonymize first, as the user themselves — this is what makes
  // prevent_protected_user_field_changes' self-service check pass.
  const { error: rpcError } = await asUser.rpc("delete_own_account");
  if (rpcError) {
    console.error("delete-account: delete_own_account RPC failed", rpcError.message);
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort avatar cleanup — never fails the request.
  if (appUser) {
    try {
      const prefix = `${appUser.university_id}/${appUser.id}`;
      const { data: files } = await asAdmin.storage.from("avatars").list(prefix);
      if (files && files.length > 0) {
        await asAdmin.storage.from("avatars").remove(files.map((f) => `${prefix}/${f.name}`));
      }
    } catch (err) {
      console.error("delete-account: avatar cleanup failed", err);
    }
  }

  // ~100 years — effectively permanent without needing a "forever" literal.
  const { error: banError } = await asAdmin.auth.admin.updateUserById(authUserId, {
    ban_duration: "876000h",
  });
  if (banError) {
    console.error("delete-account: failed to ban auth user", banError.message);
    return new Response(JSON.stringify({ error: banError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
