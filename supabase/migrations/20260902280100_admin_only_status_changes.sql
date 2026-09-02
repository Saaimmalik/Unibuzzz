-- Founder clarification for the admin dashboard: ban/suspend is admin-only,
-- not staff-wide. The original build (20260902120400_users_policies.sql)
-- let any moderator change status; this brings status changes in line with
-- role changes, which were already admin-only. The RLS UPDATE policy
-- ("staff can moderate same-university users") is left unchanged — a
-- moderator's PATCH still passes RLS, then gets rejected here by this
-- trigger with a normal Postgres exception, same as it already does for
-- role changes.
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
    if acting_role <> 'admin' or old.auth_user_id = acting_auth_id then
      raise exception 'only an admin can suspend/ban another user, and never their own';
    end if;
  end if;

  return new;
end;
$$;
