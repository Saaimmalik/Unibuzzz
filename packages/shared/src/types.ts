import type { Database } from "./supabase/database.types";

export type University = Database["public"]["Tables"]["universities"]["Row"];
export type AppUser = Database["public"]["Tables"]["users"]["Row"];
