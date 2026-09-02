import type { AppUser } from "@unibuzzz/shared";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  authUser: User | null;
  appUser: AppUser | null;
  isVerified: boolean;
  signOut: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
