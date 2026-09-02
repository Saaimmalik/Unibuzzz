-- Keeps public.users.email_verified_at in sync with auth.users.email_confirmed_at,
-- which Supabase Auth sets when the user clicks the link in their
-- verification email. Kept as its own denormalized column (rather than
-- joining to auth.users everywhere) since RLS on other tables needs a
-- cheap public.is_verified_user() check without touching the auth schema.
create or replace function public.sync_email_verified_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.users
    set email_verified_at = new.email_confirmed_at
    where auth_user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  execute function public.sync_email_verified_at();
