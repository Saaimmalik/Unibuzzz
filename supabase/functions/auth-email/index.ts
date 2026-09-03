// Supabase Auth "Send Email" hook target. Once wired up in the Supabase
// dashboard (Authentication → Hooks → Send Email → this function), Supabase
// stops sending its own built-in auth emails entirely and instead POSTs the
// email payload here for every signup/recovery/invite/email-change/
// magic-link/reauthentication event — we render a branded template and send
// it via Resend ourselves. See HANDOFF/manual-setup notes for how to enable
// this hook and where SEND_EMAIL_HOOK_SECRET comes from.
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { renderAuthEmail } from "../_shared/templates.ts";
import { sendEmail } from "../_shared/resend.ts";
import { logEmail } from "../_shared/log.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!hookSecret) {
    console.error("auth-email: SEND_EMAIL_HOOK_SECRET is not set");
    return new Response(JSON.stringify({ error: "Hook not configured" }), { status: 500 });
  }

  let verified: {
    user: { email: string };
    email_data: {
      token: string;
      token_hash: string;
      redirect_to: string;
      email_action_type: string;
      site_url: string;
    };
  };

  try {
    // Supabase's dashboard secret is formatted "v1,whsec_...."; standardwebhooks
    // expects just the "whsec_...." part.
    const wh = new Webhook(hookSecret.replace(/^v1,/, ""));
    verified = wh.verify(payload, headers) as typeof verified;
  } catch (err) {
    console.error("auth-email: signature verification failed", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  const { user, email_data } = verified;
  const { token, token_hash, redirect_to, email_action_type, site_url } = email_data;

  // Point the link at our own app page (redirect_to, e.g. /verify-email or
  // /reset-password) with the token as a query param, rather than straight at
  // Supabase's own GET /auth/v1/verify endpoint. That endpoint consumes the
  // single-use token for whoever fetches it first — including automated link
  // scanners (Microsoft Defender Safe Links etc., common on university mail),
  // which burns the token before the real user ever clicks and produces a
  // confusing "otp_expired" error. Routing through our SPA means the token is
  // only consumed by an actual browser running our JS (supabase.auth.verifyOtp()
  // on the landing page), which scanners don't execute.
  const confirmUrl = new URL(redirect_to || site_url);
  confirmUrl.searchParams.set("token_hash", token_hash);
  confirmUrl.searchParams.set("type", email_action_type);

  const { subject, html } = renderAuthEmail(email_action_type, {
    confirmUrl: confirmUrl.toString(),
    otp: token,
    email: user.email,
  });

  const result = await sendEmail({ to: user.email, subject, html });

  await logEmail({
    category: "auth",
    event_type: email_action_type,
    recipient_email: user.email,
    status: result.ok ? "sent" : "failed",
    error_message: result.ok ? null : result.error,
    provider_message_id: result.id ?? null,
  });

  if (!result.ok) {
    console.error("auth-email: send failed", email_action_type, result.error);
    // Non-2xx tells Supabase Auth the hook failed — it will surface an error
    // to the caller (e.g. signUp()/resetPasswordForEmail() rejects) instead
    // of silently pretending an email went out.
    return new Response(JSON.stringify({ error: result.error }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
