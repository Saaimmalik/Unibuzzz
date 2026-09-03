import {
  ClipboardList,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MessageSquareText,
  ShoppingBag,
  Star,
  Users,
  UsersRound,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { BrandLogo } from "./BrandLogo";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/content", label: "Content", icon: MessageSquare },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/admin/communities", label: "Communities", icon: UsersRound },
  { to: "/admin/academics", label: "Academics", icon: GraduationCap },
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquareText },
  { to: "/admin/audit-log", label: "Audit log", icon: ClipboardList },
];

function navLinkClasses(isActive: boolean) {
  return [
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-purple/10 text-brand-purple"
      : "text-stone-500 hover:bg-stone-100 hover:text-brand-ink",
  ].join(" ");
}

export function AdminLayout() {
  const { appUser } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white p-4 md:flex md:flex-col">
        <div className="px-2 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <div>
              <p className="text-base font-extrabold leading-tight tracking-tight">UniBuzzz</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-purple">
                Admin
              </p>
            </div>
          </Link>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200 pt-3">
          <p className="truncate px-2 text-xs text-stone-400">
            Signed in as {appUser?.display_name} ({appUser?.role})
          </p>
          <Link
            to="/"
            className="mt-2 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
          >
            <LogOut size={16} />
            Exit admin mode
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="border-b border-stone-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-extrabold tracking-tight">UniBuzzz Admin</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1.5 text-xs font-semibold text-brand-purple"
          >
            <LogOut size={14} />
            Exit
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  isActive
                    ? "bg-brand-purple/10 text-brand-purple"
                    : "text-stone-500 hover:bg-stone-100"
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
