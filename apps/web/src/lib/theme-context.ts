import type { ThemePreference } from "@unibuzzz/shared";
import { createContext, useContext } from "react";

export interface ThemeContextValue {
  preference: ThemePreference;
  effectiveTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
