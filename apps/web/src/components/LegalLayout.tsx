import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

// Standalone shell for the legal pages (Privacy/Cookies/Terms) — deliberately
// not AppShell, since these need to be reachable by signed-out visitors too
// (e.g. from the signup form), so they live outside ProtectedRoute in
// App.tsx. Content is hand-styled rather than a `prose` plugin class, same
// "use the existing semantic tokens" convention as the rest of the app.
export function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2">
          <BrandLogo className="h-8 w-8" />
          <span className="text-base font-extrabold tracking-tight text-brand-ink">UniBuzzz</span>
        </Link>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold text-brand-ink">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">Effective {effectiveDate}</p>

          <div className="legal-content mt-6 space-y-5 text-sm leading-relaxed text-brand-ink">
            {children}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-stone-400">
          <Link to="/legal/privacy" className="hover:text-brand-purple hover:underline">
            Privacy Policy
          </Link>
          <Link to="/legal/cookies" className="hover:text-brand-purple hover:underline">
            Cookie Policy
          </Link>
          <Link to="/legal/terms" className="hover:text-brand-purple hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-base font-bold text-brand-ink">{heading}</h2>
      <div className="space-y-2 text-stone-600">{children}</div>
    </section>
  );
}
