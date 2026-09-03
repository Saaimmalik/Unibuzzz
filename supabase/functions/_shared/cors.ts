// Shared CORS headers for the two edge functions the browser calls directly
// (delete-account, export-data) via supabase.functions.invoke — unlike
// auth-email/send-app-email, which are only ever called server-side
// (Supabase Auth's hook, Postgres via pg_net) and so never needed CORS at
// all. Wildcard origin is fine here: these functions authenticate via a
// bearer JWT the browser must explicitly attach, not an ambient cookie, so
// there's no CSRF surface a wildcard origin would open up.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
