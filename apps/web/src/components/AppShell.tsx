import { isStaffRole } from "@unibuzzz/shared";
import { Bell, Home, MessageCircle, Search, Shield, ShoppingBag, Star, User, Users } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { to: "/", label: "Feed", icon: Home, end: true },
  { to: "/communities", label: "Communities", icon: Users },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

function navLinkClasses(isActive: boolean) {
  return [
    "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
    "md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm",
    isActive
      ? "text-brand-ink bg-brand-yellow/20 md:bg-brand-yellow/15"
      : "text-stone-500 hover:text-brand-ink hover:bg-stone-100",
  ].join(" ");
}

export function AppShell() {
  const { appUser, signOut } = useAuth();
  const isStaff = isStaffRole(appUser?.role);

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white p-4 md:flex md:flex-col">
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/brand/bee-logo.png" alt="" className="h-9 w-9" />
            <span className="text-lg font-extrabold tracking-tight">UniBuzzz</span>
          </Link>
          <div className="flex items-center gap-0.5">
            <NavLink
              to="/search"
              className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
              aria-label="Search"
            >
              <Search size={20} />
            </NavLink>
            <NavLink
              to="/messages"
              className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
              aria-label="Messages"
            >
              <MessageCircle size={20} />
            </NavLink>
            {isStaff && (
              <NavLink
                to="/admin"
                className="rounded-full p-1.5 text-stone-500 hover:bg-brand-purple/10 hover:text-brand-purple"
                aria-label="Admin mode"
              >
                <Shield size={20} />
              </NavLink>
            )}
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200 pt-3">
          <NavLink to="/profile" className="block rounded-lg px-2 py-1.5 hover:bg-stone-100">
            <p className="truncate text-sm font-semibold">{appUser?.display_name ?? "…"}</p>
            <p className="truncate text-xs text-stone-500">@{appUser?.username ?? ""}</p>
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 w-full rounded-lg px-2 py-2 text-left text-sm text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <Link to="/" className="flex items-center gap-2">
          <img src="/brand/bee-logo.png" alt="" className="h-7 w-7" />
          <span className="font-extrabold tracking-tight">UniBuzzz</span>
        </Link>
        <div className="flex items-center gap-1">
          <NavLink
            to="/search"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
            aria-label="Search"
          >
            <Search size={22} />
          </NavLink>
          <NavLink
            to="/messages"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
            aria-label="Messages"
          >
            <MessageCircle size={22} />
          </NavLink>
          <NavLink
            to="/profile"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-brand-ink"
            aria-label="Profile"
          >
            <User size={22} />
          </NavLink>
          {isStaff && (
            <NavLink
              to="/admin"
              className="rounded-full p-2 text-stone-500 hover:bg-brand-purple/10 hover:text-brand-purple"
              aria-label="Admin mode"
            >
              <Shield size={22} />
            </NavLink>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full bg-brand-purple/10 px-3 py-1.5 text-xs font-semibold text-brand-purple"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-stone-200 bg-white/95 px-1 py-2 backdrop-blur md:hidden">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            <Icon size={22} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
