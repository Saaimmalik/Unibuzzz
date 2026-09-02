-- The supabase_realtime publication starts empty on a fresh project — every
-- postgres_changes subscription the frontend already relies on (feed,
-- comments, community posts) has been silently inert until a table is
-- explicitly added here. Realtime still respects each table's RLS per
-- subscriber, so this doesn't change what any given client can see.
alter publication supabase_realtime add table
  public.posts,
  public.comments,
  public.communities,
  public.community_members;
