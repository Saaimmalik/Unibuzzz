import { renderLayout, button, escapeHtml } from "./layout.ts";
import { brand, siteUrl } from "./brand.ts";

export interface RenderedEmail {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Auth emails — one per Supabase `email_action_type` sent through the Auth
// "Send Email" hook (see functions/auth-email/index.ts). Supabase stops
// sending its own built-in emails entirely once that hook is enabled, so
// every action type it can produce needs a template here.
// ---------------------------------------------------------------------------

export function renderAuthEmail(
  actionType: string,
  opts: { confirmUrl: string; otp?: string; email?: string },
): RenderedEmail {
  const { confirmUrl, otp } = opts;

  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your UniBuzzz account",
        html: renderLayout({
          preheader: "Confirm your email to start using UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Welcome to UniBuzzz 🐝</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              You're almost in. Confirm your student email to verify your account and start posting, joining communities and rating professors/courses.
            </p>
            ${button("Confirm my email", confirmUrl)}
            <p style="font-size:13px;line-height:20px;color:#71717a;margin:16px 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${confirmUrl}" style="color:${brand.purple};word-break:break-all;">${confirmUrl}</a>
            </p>
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:16px 0 0;">
              Didn't sign up for UniBuzzz? You can safely ignore this email.
            </p>
          `,
        }),
      };

    case "recovery":
      return {
        subject: "Reset your UniBuzzz password",
        html: renderLayout({
          preheader: "Reset your UniBuzzz password.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Reset your password</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              We received a request to reset your UniBuzzz password. Click below to choose a new one.
            </p>
            ${button("Reset my password", confirmUrl)}
            <p style="font-size:13px;line-height:20px;color:#71717a;margin:16px 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${confirmUrl}" style="color:${brand.purple};word-break:break-all;">${confirmUrl}</a>
            </p>
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:16px 0 0;">
              Didn't request this? Your password is still safe — you can ignore this email.
            </p>
          `,
        }),
      };

    case "email_change":
    case "email_change_current":
    case "email_change_new":
      return {
        subject: "Confirm your new UniBuzzz email address",
        html: renderLayout({
          preheader: "Confirm your new email address.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Confirm your new email</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              You asked to change the email on your UniBuzzz account. Confirm the change below.
            </p>
            ${button("Confirm email change", confirmUrl)}
            <p style="font-size:13px;line-height:20px;color:#71717a;margin:16px 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${confirmUrl}" style="color:${brand.purple};word-break:break-all;">${confirmUrl}</a>
            </p>
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:16px 0 0;">
              Didn't request this? Please ignore this email and consider changing your password.
            </p>
          `,
        }),
      };

    case "invite":
      return {
        subject: "You've been invited to UniBuzzz",
        html: renderLayout({
          preheader: "You've been invited to join UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">You're invited 🐝</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Someone has invited you to join UniBuzzz. Accept the invite to set up your account.
            </p>
            ${button("Accept invite", confirmUrl)}
            <p style="font-size:13px;line-height:20px;color:#71717a;margin:16px 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${confirmUrl}" style="color:${brand.purple};word-break:break-all;">${confirmUrl}</a>
            </p>
          `,
        }),
      };

    case "magiclink":
      return {
        subject: "Your UniBuzzz sign-in link",
        html: renderLayout({
          preheader: "Your sign-in link for UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Sign in to UniBuzzz</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Click below to sign in. This link can only be used once.
            </p>
            ${button("Sign in", confirmUrl)}
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:16px 0 0;">
              Didn't request this? You can safely ignore this email.
            </p>
          `,
        }),
      };

    case "reauthentication":
      return {
        subject: "Your UniBuzzz confirmation code",
        html: renderLayout({
          preheader: "Your confirmation code for UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Confirm it's you</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Enter this code to confirm this sensitive action on your UniBuzzz account:
            </p>
            <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:${brand.ink};margin:16px 0;text-align:center;">
              ${escapeHtml(otp ?? "")}
            </p>
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:16px 0 0;">
              Didn't request this? You can safely ignore this email.
            </p>
          `,
        }),
      };

    default:
      // Unknown/future action type — send a generic, still-branded fallback
      // rather than silently failing to email the user at all.
      return {
        subject: "Action required on your UniBuzzz account",
        html: renderLayout({
          preheader: "Action required on your UniBuzzz account.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Action required</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Please confirm this action on your UniBuzzz account.
            </p>
            ${button("Continue", confirmUrl)}
          `,
        }),
      };
  }
}

// ---------------------------------------------------------------------------
// App emails — transactional emails for in-app events, fired from Postgres
// (see supabase/migrations/20260903030000_email_notifications.sql). Keyed by
// the same `type` string used for `notifications.type` where one exists, so
// call sites don't need a second vocabulary. To add a new one: add a case
// here, then have the trigger/RPC that creates the event call
// `public.trigger_transactional_email(...)` (or `create_notification(...,
// p_send_email := true)` if it already creates an in-app notification).
// ---------------------------------------------------------------------------

export function renderAppEmail(
  type: string,
  opts: { recipientName: string; linkPath: string | null; preview: string | null },
): RenderedEmail {
  const { recipientName, linkPath, preview } = opts;
  const url = linkPath ? `${siteUrl()}${linkPath}` : siteUrl();
  const name = escapeHtml(recipientName || "there");

  switch (type) {
    case "community_approved":
      return {
        subject: `Your community "${preview ?? ""}" was approved`,
        html: renderLayout({
          preheader: "Your community request was approved.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Your community is live 🎉</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, good news — <strong>${escapeHtml(preview ?? "your community")}</strong> was approved and is now live on UniBuzzz.
            </p>
            ${button("View community", url)}
          `,
        }),
      };

    case "community_rejected":
      return {
        subject: `Your community request wasn't approved`,
        html: renderLayout({
          preheader: "Your community request was not approved.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Community request update</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, your request to create <strong>${escapeHtml(preview ?? "a community")}</strong> wasn't approved by moderators this time.
            </p>
            ${button("Browse communities", url)}
          `,
        }),
      };

    case "content_removed":
      return {
        subject: "Your content was removed",
        html: renderLayout({
          preheader: "One of your posts was removed by a moderator.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Content removed</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, your ${escapeHtml(preview ?? "content")} was removed by a moderator for not following UniBuzzz's community guidelines.
            </p>
            ${linkPath ? button("View details", url) : ""}
          `,
        }),
      };

    case "post_like":
      return {
        subject: "Someone liked your post",
        html: renderLayout({
          preheader: "Someone liked your post on UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">New like 👍</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, someone liked your post on UniBuzzz.
            </p>
            ${button("View post", url)}
          `,
        }),
      };

    case "post_comment":
      return {
        subject: "Someone commented on your post",
        html: renderLayout({
          preheader: "Someone commented on your post on UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">New comment 💬</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, someone commented on your post${preview ? `: "${escapeHtml(preview)}"` : ""}
            </p>
            ${button("View post", url)}
          `,
        }),
      };

    case "message":
      return {
        subject: "You have a new message",
        html: renderLayout({
          preheader: "You have a new message on UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">New message ✉️</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, you have a new message${preview ? `: "${escapeHtml(preview)}"` : ""}
            </p>
            ${button("View message", url)}
          `,
        }),
      };

    case "review_helpful":
      return {
        subject: "Someone found your review helpful",
        html: renderLayout({
          preheader: "Someone marked your review as helpful.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Your review helped someone 🙌</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, another student marked one of your reviews as helpful.
            </p>
            ${button("View review", url)}
          `,
        }),
      };

    // Internal notification for the UniBuzzz team, not a student — sent to
    // a fixed founder inbox by notify_new_feedback(), not through
    // create_notification's per-recipient preference gate.
    case "feedback_new":
      return {
        subject: `New ${(preview ?? "").startsWith("bug_report") ? "bug report" : "feature request"}`,
        html: renderLayout({
          preheader: "New feedback submitted on UniBuzzz.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">New feedback submitted</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              ${escapeHtml(preview ?? "A user submitted feedback.")}
            </p>
            ${button("Review in admin", url)}
          `,
        }),
      };

    case "report_resolved":
      return {
        subject: "Your report was reviewed",
        html: renderLayout({
          preheader: "A report you filed has been reviewed.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">Report reviewed</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, a report you filed has been reviewed by moderators. Outcome: <strong>${escapeHtml(preview ?? "resolved")}</strong>.
            </p>
            ${button("View notifications", url)}
          `,
        }),
      };

    default:
      return {
        subject: "You have a new UniBuzzz notification",
        html: renderLayout({
          preheader: "You have a new notification.",
          bodyHtml: `
            <h1 style="font-size:20px;margin:0 0 12px;">New notification</h1>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 8px;">
              Hey ${name}, you have a new notification on UniBuzzz.
            </p>
            ${button("Open UniBuzzz", url)}
          `,
        }),
      };
  }
}
