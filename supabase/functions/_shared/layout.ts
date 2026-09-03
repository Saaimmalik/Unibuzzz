import { brand, logoUrl } from "./brand.ts";

// One branded shell every template renders into — bee logo header, clean
// white card body, brand-purple footer. Adding a new template means writing
// a heading/body/button, not a new HTML document; see templates.ts.
export function renderLayout(opts: { preheader?: string; bodyHtml: string }): string {
  const { preheader = "", bodyHtml } = opts;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>UniBuzzz</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f5f5f4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(10,10,10,0.08);">
          <tr>
            <td style="background-color:${brand.yellow};padding:24px 32px;text-align:center;">
              <img src="${logoUrl()}" alt="UniBuzzz" width="48" height="48" style="display:block;margin:0 auto 8px;border-radius:12px;" />
              <span style="font-size:20px;font-weight:700;color:${brand.ink};letter-spacing:-0.02em;">UniBuzzz</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:${brand.ink};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:${brand.ink};padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:18px;color:#a1a1aa;">
                You're receiving this because you have a UniBuzzz account.
              </p>
              <p style="margin:4px 0 0;font-size:12px;line-height:18px;">
                <span style="color:${brand.purpleLight};">UniBuzzz</span>
                <span style="color:#71717a;"> — university-only, for students only.</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:10px;background-color:${brand.yellow};">
        <a href="${url}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:${brand.ink};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
