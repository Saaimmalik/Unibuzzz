import type { AppUser } from "@unibuzzz/shared";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { supabase } from "./supabase";

// Set right before signing out a 'deleted' account, read once by LoginPage
// to explain why the session just vanished — plain localStorage rather than
// route state, since the sign-out happens deep inside this provider, not in
// response to a user action LoginPage could attach state to.
export const DELETED_ACCOUNT_NOTICE_KEY = "unibuzzz-account-deleted-notice";

// Resolves the app-level profile for a freshly-established session, and
// enforces the two self-service account-lifecycle states that a plain
// `select *` can't: a 'deactivated' account is transparently reactivated by
// the act of logging back in (per the founder's chosen UX — no separate
// confirmation screen), while a 'deleted' account is terminal and gets
// signed straight back out. Returns the profile to adopt (null if the
// session was just killed).
async function resolveAppUser(authUserId: string): Promise<AppUser | null> {
  const { data } = await supabase.from("users").select("*").eq("auth_user_id", authUserId).single();
  if (!data) return null;

  if (data.status === "deleted") {
    try {
      localStorage.setItem(DELETED_ACCOUNT_NOTICE_KEY, "1");
    } catch {
      // ignore — the notice is a nice-to-have, not required for correctness.
    }
    await supabase.auth.signOut();
    return null;
  }

  if (data.status === "deactivated") {
    const { error } = await supabase.rpc("reactivate_own_account");
    if (!error) {
      return { ...data, status: "active" };
    }
  }

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  const loadAppUser = useCallback(async (authUserId: string) => {
    setAppUser(await resolveAppUser(authUserId));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad(authUserId: string) {
      const resolved = await resolveAppUser(authUserId);
      if (!cancelled) setAppUser(resolved);
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
