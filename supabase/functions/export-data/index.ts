// Called by the frontend (Settings → Download my data). Gathers everything
// this account owns into one JSON document and returns it directly in the
// response for an immediate in-browser download — the "synchronous export"
// approach the founder chose over an async emailed-link flow.
//
// Uses the CALLER's own JWT (not the service role) for every query, so this
// can only ever return what RLS already lets this exact user see — the
// service role is never touched here, deliberately: an export endpoint is
// the last place to loosen the security boundary.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    console.error("export-data: missing SUPABASE_URL/ANON_KEY");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profile, error: profileErr } = await asUser
    .from("users")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .single();
  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const id = profile.id as string;

  const [
    posts,
    comments,
    reactions,
    listings,
    reviews,
    reviewVotes,
    messages,
    conversations,
    followingRows,
    followerRows,
    blockedUsers,
    notifications,
    feedback,
    communityMemberships,
    entitySubmissions,
  ] = await Promise.all([
    asUser.from("posts").select("*").eq("author_id", id),
    asUser.from("comments").select("*").eq("author_id", id),
    asUser.from("reactions").select("*").eq("user_id", id),
    asUser.from("listings").select("*").eq("seller_id", id),
    asUser.from("reviews").select("*").eq("reviewer_id", id),
    asUser.from("review_votes").select("*").eq("user_id", id),
    asUser.from("messages").select("*").eq("sender_id", id),
    asUser.from("conversation_participants").select("conversation_id").eq("user_id", id),
    asUser.from("follows").select("*").eq("follower_id", id),
    asUser.from("follows").select("*").eq("following_id", id),
    asUser.from("blocked_users").select("*").eq("blocker_id", id),
    asUser.from("notifications").select("*").eq("recipient_id", id),
    asUser.from("feedback").select("*").eq("user_id", id),
    asUser.from("community_members").select("*").eq("user_id", id),
    asUser.from("entity_submissions").select("*").eq("submitted_by", id),
  ]);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    profile,
    posts: posts.data ?? [],
    comments: comments.data ?? [],
    reactions: reactions.data ?? [],
    listings: listings.data ?? [],
    reviews: reviews.data ?? [],
    review_votes: reviewVotes.data ?? [],
    messages_sent: messages.data ?? [],
    conversation_ids: (conversations.data ?? []).map((c) => c.conversation_id),
    following: followingRows.data ?? [],
    followers: followerRows.data ?? [],
    blocked_users: blockedUsers.data ?? [],
    notifications: notifications.data ?? [],
    feedback_submitted: feedback.data ?? [],
    community_memberships: communityMemberships.data ?? [],
    entity_submissions: entitySubmissions.data ?? [],
  };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="unibuzzz-data-export.json"',
    },
  });
});
