-- Read: any signed-in user can see profiles within their own university
-- (needed for feed authorship, search, profile pages). Cross-university
-- reads are never allowed, even for staff.
create policy "users can read same-university profiles"
  on public.users for select
  to authenticated
  using (university_id = public.current_university_id());

-- Update: a user can update their own row...
create policy "users can update own profile"
  on public.users for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ...and staff can update rows of other users in their own university
-- (e.g. suspend/ban, promote a moderator). Column-level restrictions for
-- both paths (no one changes university_id; role/status changes require
-- the right privilege and can never target the actor's own row) are
-- enforced by the trigger below, since RLS itself is row-level only.
create policy "staff can moderate same-university users"
  on public.users for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (university_id = public.current_university_id());

-- No INSERT policy for `authenticated`/`anon`: app-user rows are created by
-- the signup Edge Function using the service role (bypasses RLS) only after
-- it has verified the email domain against public.universities. This is
-- what prevents a client from inserting itself into an arbitrary
-- university_id or role.

create or replace function public.prevent_protected_user_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_role text := public.current_app_role();
  acting_auth_id uuid := auth.uid();
begin
  if new.university_id is distinct from old.university_id then
    raise exception 'university_id cannot be changed';
  end if;

  if new.role is distinct from old.role then
    if acting_role <> 'admin' or old.auth_user_id = acting_auth_id then
      raise exception 'only an admin can change another user''s role';
    end if;
  end if;

  if new.status is distinct from old.status then
    if acting_role not in ('admin', 'moderator') or old.auth_user_id = acting_auth_id then
      raise exception 'only staff can change another user''s status, and never their own';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.prevent_protected_user_field_changes is
  'Column-level guard the two UPDATE policies above cannot express on their own: university_id is immutable; role can only be changed by an admin acting on someone else; status (suspend/ban) can only be changed by staff acting on someone else. Prevents self-escalation.';

create trigger users_protect_fields
  before update on public.users
  for each row
  execute function public.prevent_protected_user_field_changes();
