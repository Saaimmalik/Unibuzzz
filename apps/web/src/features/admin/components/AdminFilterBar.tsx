import { Search } from "lucide-react";
import type { ReactNode } from "react";

// Debounced search input + arbitrary filter selects (passed as children),
// reused across every admin list page.
export function AdminFilterBar({
  query,
  onQueryChange,
  placeholder = "Search…",
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-brand-ink placeholder:text-stone-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
        />
      </div>
      {children}
    </div>
  );
}

export const adminSelectClasses =
  "rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm text-brand-ink focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20";
