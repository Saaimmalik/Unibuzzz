import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Factory instead of a module-level singleton so apps/web (import.meta.env)
 * and the future apps/mobile (Expo env) can each supply config their own way
 * without this package depending on either platform's env system.
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
