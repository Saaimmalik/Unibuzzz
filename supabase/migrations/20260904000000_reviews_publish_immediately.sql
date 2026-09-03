-- Removes the pre-publication approval gate for reviews (founder decision,
-- 2026-09-04): reviews now publish immediately on submission, same as posts/
-- comments/listings/communities — moderation is passive (staff can hide/
-- remove an individual review after the fact from /admin/reviews, and the
-- existing 2+ report auto-hide still applies) rather than active pre-review.
-- `flagged_pii` is still computed and shown to staff as a triage signal, it
-- just no longer blocks publication.

update public.reviews set status = 'visible' where status = 'pending';

-- Looked up by definition rather than assuming Postgres's default
-- <table>_<column>_check auto-generated name, so this doesn't silently
-- no-op (or fail) if that naming assumption turns out to be wrong.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.reviews'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%pending%';

  if v_constraint_name is not null then
    execute format('alter table public.reviews drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.reviews add constraint reviews_status_check
  check (status in ('visible', 'hidden', 'removed'));

comment on table public.reviews is
  'Immutable once created (see reviews_protect_fields below) — only status may change. A removed review does not block a fresh one: see reviews_one_active_per_target, the partial unique index below. Reviews publish immediately (no pending/approval state) — moderation is passive, via staff hide/remove and the report auto-hide threshold.';

create or replace function public.reviews_apply_trust_and_pii_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.flagged_pii := (
    new.body ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    or new.body ~ '(\+?[0-9][\s.-]?){7,}'
    or coalesce(new.title, '') ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  );
  new.status := 'visible';

  return new;
end;
$$;
