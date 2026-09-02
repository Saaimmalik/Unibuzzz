-- Creates the public.users row the moment Supabase Auth creates the
-- underlying auth.users row, resolving university_id from the email
-- domain server-side so a client can never insert itself into an
-- arbitrary university. Raising an exception here rolls back the whole
-- signup transaction (auth.users insert included), so an unsupported
-- domain or a taken username never results in an orphaned auth account.
--
-- Friendly, specific error messages for the signup form come from
-- public.resolve_university_for_email() and public.is_username_available(),
-- called client-side BEFORE signUp (see 20260902130200_signup_helpers.sql).
-- This trigger is the non-bypassable backstop, not the primary UX path —
-- Supabase's Auth API does not reliably forward custom trigger error text
-- to the client, so relying on it alone would give a poor error message.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
  v_domain text;
  v_username text;
  v_display_name text;
begin
  v_domain := lower(split_part(new.email, '@', 2));

  select id into v_university_id
  from public.universities
  where v_domain = any(email_domains)
    and status = 'active'
  limit 1;

  if v_university_id is null then
    raise exception 'UNSUPPORTED_EMAIL_DOMAIN: % is not a supported university email domain', v_domain;
  end if;

  v_username := lower(trim(new.raw_user_meta_data->>'username'));
  v_display_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), v_username);

  if v_username is null or length(v_username) < 3 then
    raise exception 'INVALID_USERNAME: username must be at least 3 characters';
  end if;

  begin
    insert into public.users (
      university_id, auth_user_id, email, email_verified_at, username, display_name
    ) values (
      v_university_id, new.id, new.email, new.email_confirmed_at, v_username, v_display_name
    );
  exception
    when unique_violation then
      raise exception 'USERNAME_TAKEN: username % is already taken', v_username;
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
