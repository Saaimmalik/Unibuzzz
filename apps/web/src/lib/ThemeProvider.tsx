import type { ThemePreference } from "@unibuzzz/shared";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { supabase } from "./supabase";
import { ThemeContext } from "./theme-context";

const STORAGE_KEY = "unibuzzz-theme";

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage can throw in some private-browsing contexts — fall through to default.
  }
  return "dark";
}

function resolveEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

function applyTheme(effectiveTheme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", effectiveTheme === "dark" ? "#0a0a0a" : "#F6BA24");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { appUser, refreshAppUser } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const effectiveTheme = resolveEffectiveTheme(preference);
  // Which user id (if any) we've already pulled theme_preference from.
  // Adopting the DB value is a one-shot thing per login, not "whenever
  // appUser changes" — the latter is racy: setPreference's DB write is
  // fire-and-forget, so a page reload shortly after changing the
  // preference can refetch appUser *before* that write lands, see a stale
  // value, and stomp the just-made local choice right back. Syncing only
  // once per user id avoids that regardless of write timing.
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  // Live-updates when the OS theme changes while "system" is selected.
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveEffectiveTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  useEffect(() => {
    if (!appUser) {
      syncedUserIdRef.current = null;
      return;
    }
    if (syncedUserIdRef.current === appUser.id) return;
    syncedUserIdRef.current = appUser.id;

    setPreferenceState(appUser.theme_preference);
    try {
      localStorage.setItem(STORAGE_KEY, appUser.theme_preference);
    } catch {
      // ignore — localStorage is a convenience cache, not required for correctness.
    }
  }, [appUser]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      if (appUser) {
        void supabase
          .from("users")
          .update({ theme_preference: next })
          .eq("id", appUser.id)
          .then(() => refreshAppUser());
      }
    },
    [appUser, refreshAppUser],
  );

  return (
    <ThemeContext.Provider value={{ preference, effectiveTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
