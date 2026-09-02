import type { AppUser } from "@unibuzzz/shared";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { supabase } from "./supabase";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  const loadAppUser = useCallback(async (authUserId: string) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authUserId)
      .single();
    setAppUser(data ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad(authUserId: string) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();
      if (!cancelled) setAppUser(data ?? null);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) void initialLoad(data.session.user.id);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void initialLoad(nextSession.user.id);
      } else {
        setAppUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    loading,
    session,
    authUser: session?.user ?? null,
    appUser,
    isVerified: session?.user.email_confirmed_at != null,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshAppUser: async () => {
      if (session) await loadAppUser(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
