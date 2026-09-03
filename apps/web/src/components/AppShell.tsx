import { isStaffRole } from "@unibuzzz/shared";
import {
  Bell,
  Home,
  MessageCircle,
  Search,
  Shield,
  ShoppingBag,
  Star,
  User,
  Users,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useUnreadNotificationsCount } from "../features/notifications/hooks";
import { useAuth } from "../lib/auth-context";
import { BrandLogo } from "./BrandLogo";
import { InstallPrompt } from "./InstallPrompt";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";

const navItems = [
  { to: "/", label: "Feed", icon: Home, end: true },
  { to: "/communities", label: "Communities", icon: Users },
  { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

// Mobile bottom tab bar only — adds Profile as a 6th tab (mirrors
// Instagram/X's convention of a bottom-tab profile slot), separate from
// the desktop sidebar's navItems since the sidebar already has its own
// profile card + sign-out block at the bottom (see the `<aside>` below) —
// adding Profile to the shared navItems would duplicate it there.
const mobileNavItems = [...navItems, { to: "/profile", label: "Profile", icon: User }];

function navLinkClasses(isActive: boolean) {
  return [
    // Base (mobile bottom tab bar) tier only applies below the md breakpoint
    // — the desktop sidebar is `hidden md:flex`, so it only ever renders
    // with the md: tier active. Kept tight (px-1, 10px text) specifically
    // because six tabs (Feed/Communities/Marketplace/Reviews/Alerts/Profile)
    // need to fit without "Communities"/"Marketplace" pushing later tabs
    // off-screen on a ~375-390px-wide phone. `flex-1` gives every tab equal
    // width regardless of label length — without it, a longer label like
    // "Marketplace" makes that tab's own box wider than "Alerts"'s, and
    // even though justify-around's margins are technically equal, the
    // uneven box widths make icons under short labels look bunched
    // together relative to icons under long ones. `md:flex-initial`
    // undoes this for the desktop sidebar, where items are a vertical
    // list (flex-1 there would stretch each row to fill leftover height).
    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors",
    "md:flex-initial md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm",
    isActive
      ? "text-brand-ink bg-brand-yellow/20 md:bg-brand-yellow/15"
      : "text-stone-500 hover:text-brand-ink hover:bg-stone-100",
  ].join(" ");
}

function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function AppShell() {
  const { appUser, signOut } = useAuth();
  const isStaff = isStaffRole(appUser?.role);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white p-4 md:flex md:flex-col">
        <div className="flex items-center justify-between px-2 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9" />
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
              <span className="relative">
                <Icon size={20} strokeWidth={2} />
                {to === "/notifications" && <NotificationBadge count={unreadCount} />}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200 pt-3">
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100">
            <NavLink to="/profile" className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{appUser?.display_name ?? "…"}</p>
              <p className="truncate text-xs text-stone-500">@{appUser?.username ?? ""}</p>
            </NavLink>
            {isStaff && (
              <NavLink
                to="/admin"
                className="shrink-0 rounded-full p-1.5 text-stone-500 hover:bg-brand-purple/10 hover:text-brand-purple"
                aria-label="Admin mode"
              >
                <Shield size={18} />
              </NavLink>
            )}
          </div>
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
          <BrandLogo className="h-7 w-7" />
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

      {/* Mobile bottom tab bar. No justify-around — each tab is flex-1
          (see navLinkClasses) so they're equal-width and evenly spaced
          regardless of label length. */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-stone-200 bg-white/95 px-1 py-2 backdrop-blur md:hidden">
        {mobileNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={2} />
              {to === "/notifications" && <NotificationBadge count={unreadCount} />}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Mounted here (not globally) so they never overlap the short,
          vertically-centered auth-flow screens — see InstallPrompt/
          PwaUpdatePrompt for positioning tuned around this shell's own
          bottom tab bar. */}
      <InstallPrompt />
      <PwaUpdatePrompt />
    </div>
  );
}
