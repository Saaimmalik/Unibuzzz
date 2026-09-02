-- SECURITY DEFINER helper functions used inside RLS policies across the
-- whole schema. They run as the function owner (bypassing RLS on the
-- underlying `users` lookup), which avoids infinite recursion that would
-- occur if a `users` RLS policy queried `users` directly under the caller's
-- own (RLS-restricted) role. This is the standard Supabase pattern for
-- "look up the current tenant/role" helpers.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.current_university_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select university_id from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('moderator', 'admin'), false)
$$;

-- Used by every future content table (posts, comments, listings, reviews,
-- messages, ...) so a suspended/banned user is blocked from writing new
-- content everywhere, in one place, rather than re-checking status per table.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select status = 'active' from public.users where auth_user_id = auth.uid()),
    false
  )
$$;
