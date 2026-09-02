import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { LoadingScreen } from "./LoadingScreen";

export function ProtectedRoute() {
  const { loading, session, isVerified } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isVerified) return <Navigate to="/verify-email" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { loading, session, isVerified } = useAuth();

  if (loading) return <LoadingScreen />;
  if (session && isVerified) return <Navigate to="/" replace />;
  if (session && !isVerified) return <Navigate to="/verify-email" replace />;

  return <Outlet />;
}
