import type { UserRole } from "./supabase/database.types";

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return role === "moderator" || role === "admin";
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin";
}
