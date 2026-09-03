// Mirrors packages/shared/src/brand.ts — kept in sync by hand, same as that
// file already is with apps/web/src/index.css (Deno edge functions can't
// import a pnpm workspace package across the supabase/ boundary).
export const brand = {
  yellow: "#F6BA24",
  orange: "#E8960F",
  purple: "#6529C9",
  purpleLight: "#905DDE",
  ink: "#0A0A0A",
} as const;

// Public site origin (e.g. https://unibuzzz.app or http://localhost:5173 in
// dev). Used to build the logo <img> src (must be a publicly fetchable URL —
// email clients cannot reach localhost or a private Supabase URL) and to
// build "open in UniBuzzz" links for app-triggered emails. Set as an edge
// function secret, never hardcoded, since it differs per environment.
export function siteUrl(): string {
  const url = Deno.env.get("PUBLIC_SITE_URL");
  if (!url) {
    throw new Error("PUBLIC_SITE_URL secret is not set");
  }
  return url.replace(/\/$/, "");
}

export function logoUrl(): string {
  return `${siteUrl()}/brand/bee-logo.png`;
}
