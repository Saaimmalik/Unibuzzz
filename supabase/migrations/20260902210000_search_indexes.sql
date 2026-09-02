-- Trigram indexes so ILIKE '%query%' substring search stays fast as these
-- tables grow, rather than a sequential scan. No RLS changes needed — email
-- is already a readable column on public.users for any same-university
-- authenticated user (see 20260902120400_users_policies.sql), so allowing
-- search-by-email is just exposing an existing read, not a new grant.
create index users_display_name_trgm_idx on public.users using gin (display_name gin_trgm_ops);
create index users_email_trgm_idx on public.users using gin (email gin_trgm_ops);
create index posts_body_trgm_idx on public.posts using gin (body gin_trgm_ops);
