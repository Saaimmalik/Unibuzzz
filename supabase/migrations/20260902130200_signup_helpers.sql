-- Called by the signup form BEFORE supabase.auth.signUp(), so a bad email
-- domain or a taken username gets a specific, friendly error instead of
-- relying on handle_new_auth_user()'s trigger exception (whose message
-- Supabase's Auth API does not reliably surface to the client).

-- public.universities is already publicly readable via RLS, so this needs
-- no elevated privilege — it's a convenience wrapper for the domain lookup.
create or replace function public.resolve_university_for_email(p_email text)
returns public.universities
language sql
stable
as $$
  select u.*
  from public.universities u
  where lower(split_part(p_email, '@', 2)) = any(u.email_domains)
    and u.status = 'active'
  limit 1
$$;

-- SECURITY DEFINER: a pre-signup, not-yet-authenticated visitor has no RLS
-- access to public.users at all, but needs to know if a username is taken.
-- Only ever returns a boolean, never row data, so this doesn't leak
-- anything beyond "is this exact username in use".
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.users where username = lower(trim(p_username))
  )
$$;

-- For future content-table RLS policies (posts, comments, reviews, ...) to
-- require verified accounts, alongside the existing public.is_active_user().
create or replace function public.is_verified_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select email_verified_at is not null from public.users where auth_user_id = auth.uid()),
    false
  )
$$;
