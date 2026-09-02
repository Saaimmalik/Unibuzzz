import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/brand/bee-logo.png" alt="UniBuzzz" className="h-14 w-14" />
          <div>
            <h1 className="text-xl font-extrabold text-brand-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">{children}</div>

        {footer && <div className="mt-5 text-center text-sm text-stone-500">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-brand-ink">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

export const authInputClasses =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20";

export const authButtonClasses =
  "w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-60";
