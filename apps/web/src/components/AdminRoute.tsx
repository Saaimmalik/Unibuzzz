import { isStaffRole } from "@unibuzzz/shared";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

// UX-only guard — the real security boundary is Postgres RLS (is_staff()
// checks on every staff-moderate policy/RPC), which holds regardless of
// whether a request ever goes through this component. This just keeps a
// non-staff user from landing on an admin page that would render empty/
// erroring queries.
export function AdminRoute() {
  const { appUser, loading } = useAuth();

  if (loading) return null;
  if (!isStaffRole(appUser?.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
