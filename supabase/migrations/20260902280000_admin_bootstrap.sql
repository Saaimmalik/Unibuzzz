-- One-time bootstrap: promote the founder's own account to admin. This
-- cannot go through the app — prevent_protected_user_field_changes
-- (20260902120400_users_policies.sql) blocks a user from ever changing
-- their own role, by design, to prevent self-escalation. Migrations run as
-- the table-owning role, which bypasses RLS entirely (no policy here sets
-- FORCE ROW LEVEL SECURITY), so RLS is not what's standing in the way —
-- only the trigger is. Explicitly disable/re-enable it for this one UPDATE
-- rather than relying on auth.uid() resolving to NULL in a migration
-- context (which would also happen to let this through, but that's an
-- incidental side effect of the trigger's own logic, not a guarantee this
-- migration should depend on).
do $$
declare
  v_updated int;
begin
  alter table public.users disable trigger users_protect_fields;

  update public.users
  set role = 'admin'
  where email = 'muhammadsaaim.malik@ucdconnect.ie';

  get diagnostics v_updated = row_count;

  alter table public.users enable trigger users_protect_fields;

  if v_updated = 0 then
    raise exception 'Bootstrap admin: no user row found for muhammadsaaim.malik@ucdconnect.ie — has this account signed up yet?';
  end if;
end $$;
