import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Toggle } from "./Toggle";

// Shared building blocks for the Settings page and its sub-screens
// (Privacy, Blocked users, Email preferences) — kept in one place since all
// four pages compose from the same shapes: a card section, a toggle row
// inside one, a row that navigates to its own dedicated screen, and each
// sub-screen's own back-to-Settings header.

export function SettingsCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      {title && <h2 className="text-sm font-bold text-brand-ink">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
      <div className={title || description ? "mt-3" : undefined}>{children}</div>
    </section>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-brand-ink">{label}</p>
        {description && <p className="text-xs text-stone-500">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

// A Settings-page row that navigates to its own dedicated screen, rather
// than expanding inline — used for the sections with enough content of
// their own to deserve a full page (Privacy, Blocked users, Email
// preferences).
export function SettingsNavRow({
  icon: Icon,
  label,
  description,
  to,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 hover:bg-stone-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={18} className="shrink-0 text-stone-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-ink">{label}</p>
          {description && <p className="truncate text-xs text-stone-500">{description}</p>}
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-stone-400" />
    </Link>
  );
}

// Shared header for every Settings sub-screen — back arrow + title, same
// shape as the Settings page's own header back to /profile.
export function SettingsSubpageHeader({ title, backTo }: { title: string; backTo: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={backTo}
        className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
        aria-label="Back"
      >
        <ChevronLeft size={20} />
      </Link>
      <h1 className="text-lg font-bold text-brand-ink">{title}</h1>
    </div>
  );
}
