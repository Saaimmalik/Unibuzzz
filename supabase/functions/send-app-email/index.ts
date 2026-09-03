// Generic transactional-email endpoint for in-app events (community
// approval/rejection, moderation, report resolution, ...). Called
// server-side only, from Postgres via pg_net (see
// public.trigger_transactional_email in
// supabase/migrations/20260903030000_email_notifications.sql) — never from
// the browser. Authenticated with a shared secret rather than a user JWT,
// since the caller is the database itself, not a logged-in client.
import { renderAppEmail } from "../_shared/templates.ts";
import { sendEmail } from "../_shared/resend.ts";
import { logEmail } from "../_shared/log.ts";

interface AppEmailRequest {
  type: string;
  recipientEmail: string;
  recipientName?: string;
  linkPath?: string | null;
  preview?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const expectedSecret = Deno.env.get("INTERNAL_EMAIL_SECRET");
  const providedSecret = req.headers.get("x-internal-secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: AppEmailRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!body.type || !body.recipientEmail) {
    return new Response(JSON.stringify({ error: "type and recipientEmail are required" }), {
      status: 400,
    });
  }

  const { subject, html } = renderAppEmail(body.type, {
    recipientName: body.recipientName ?? "",
    linkPath: body.linkPath ?? null,
    preview: body.preview ?? null,
  });

  const result = await sendEmail({ to: body.recipientEmail, subject, html });

  await logEmail({
    category: "app",
    event_type: body.type,
    recipient_email: body.recipientEmail,
    status: result.ok ? "sent" : "failed",
    error_message: result.ok ? null : result.error,
    provider_message_id: result.id ?? null,
  });

  if (!result.ok) {
    console.error("send-app-email: send failed", body.type, result.error);
    return new Response(JSON.stringify({ error: result.error }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
