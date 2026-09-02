import { createSupabaseClient } from "@unibuzzz/shared";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy apps/web/.env.example to apps/web/.env and fill in your Supabase project's values.",
  );
}

export const supabase = createSupabaseClient({ url, anonKey });
