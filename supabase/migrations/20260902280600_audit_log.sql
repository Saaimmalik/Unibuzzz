create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_university_id_created_at_idx on public.audit_log (university_id, created_at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);

alter table public.audit_log enable row level security;

create policy "staff can read audit log in their university"
  on public.audit_log for select
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id());

-- Fallback insert path for any staff-initiated action not covered by the
-- triggers/RPCs below. No UPDATE/DELETE policy for anyone — append-only by
-- design, for tamper resistance.
create policy "staff can write their own audit log entries"
  on public.audit_log for insert
  to authenticated
  with check (
    public.is_staff()
    and actor_id = public.current_app_user_id()
    and university_id = public.current_university_id()
  );

-- users: no is_staff() gate needed inside this trigger.
-- prevent_protected_user_field_changes (the BEFORE trigger on this same
-- table) already guarantees any role/status change that reaches this AFTER
-- trigger was made by an admin acting on someone else — an unauthorized
-- attempt never gets this far, so re-checking here would be redundant.
create or replace function public.audit_log_user_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (new.university_id, public.current_app_user_id(), 'user_role_changed', 'user', new.id,
      jsonb_build_object('from', old.role, 'to', new.role));
  end if;

  if new.status is distinct from old.status then
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (new.university_id, public.current_app_user_id(), 'user_status_changed', 'user', new.id,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  return new;
end;
$$;

create trigger users_audit_log
  after update of role, status on public.users
  for each row
  execute function public.audit_log_user_change();

-- posts/comments/listings/reviews/communities: these tables let BOTH the
-- content owner (self-service) and staff (moderation) reach the same
-- status/deleted_at column via different RLS policies, so each trigger here
-- DOES need its own is_staff() check to distinguish a self-service action
-- from an actual moderation action.
create or replace function public.audit_log_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at and public.is_staff() then
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (
      new.university_id, public.current_app_user_id(),
      case when new.deleted_at is not null then 'post_removed' else 'post_restored' end,
      'post', new.id, '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger posts_audit_log
  after update of deleted_at on public.posts
  for each row
  execute function public.audit_log_post_moderation();

create or replace function public.audit_log_comment_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
begin
  if new.deleted_at is distinct from old.deleted_at and public.is_staff() then
    select university_id into v_university_id from public.posts where id = new.post_id;
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (
      v_university_id, public.current_app_user_id(),
      case when new.deleted_at is not null then 'comment_removed' else 'comment_restored' end,
      'comment', new.id, '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger comments_audit_log
  after update of deleted_at on public.comments
  for each row
  execute function public.audit_log_comment_moderation();

create or replace function public.audit_log_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and public.is_staff() then
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (
      new.university_id, public.current_app_user_id(), 'listing_status_changed',
      'listing', new.id, jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger listings_audit_log
  after update of status on public.listings
  for each row
  execute function public.audit_log_listing_moderation();

create or replace function public.audit_log_review_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and public.is_staff() then
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (
      new.university_id, public.current_app_user_id(), 'review_status_changed',
      'review', new.id, jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger reviews_audit_log
  after update of status on public.reviews
  for each row
  execute function public.audit_log_review_moderation();

create or replace function public.audit_log_community_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and public.is_staff() then
    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (
      new.university_id, public.current_app_user_id(), 'community_status_changed',
      'community', new.id, jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger communities_audit_log
  after update of status on public.communities
  for each row
  execute function public.audit_log_community_moderation();

-- Resolves/dismisses a report and writes the audit_log row atomically. Note
-- this does NOT itself take the underlying moderation action (e.g. remove
-- the reported post) — that happens via the target's own staff-moderate
-- policy (PATCHing posts/listings/etc. directly, which auto-logs via the
-- triggers above). resolve_report just closes out the report entry, and can
-- be called with or without a prior content action having been taken (e.g.
-- "dismissed, not actually a violation").
create or replace function public.resolve_report(
  p_report_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Only staff can resolve reports';
  end if;
  if p_decision not in ('resolved', 'dismissed') then
    raise exception 'Invalid decision';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if v_report.id is null or v_report.university_id <> public.current_university_id() then
    raise exception 'Report not found';
  end if;
  if v_report.status <> 'pending' then
    raise exception 'Report already resolved';
  end if;

  update public.reports
  set status = p_decision, resolved_by = public.current_app_user_id(), resolved_at = now(), resolution_note = p_note
  where id = p_report_id;

  insert into public.audit_log (university_id, actor_id, action, target_type, target_id, reason, metadata)
  values (
    v_report.university_id, public.current_app_user_id(), 'report_' || p_decision,
    v_report.target_type, v_report.target_id, p_note,
    jsonb_build_object('report_id', v_report.id, 'report_reason', v_report.reason)
  );
end;
$$;

-- Re-create admin_review_entity_submission (identical to
-- 20260902280500_entity_submissions_communities.sql's body, plus one
-- audit_log insert added before each of the three returns) now that
-- audit_log exists.
create or replace function public.admin_review_entity_submission(
  p_submission_id uuid,
  p_decision text,
  p_merge_into_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.entity_submissions%rowtype;
  v_new_id uuid;
  v_code text;
begin
  if not public.is_staff() then
    raise exception 'Only staff can review submissions';
  end if;
  if p_decision not in ('approve', 'reject', 'duplicate') then
    raise exception 'Invalid decision';
  end if;

  select * into v_sub from public.entity_submissions where id = p_submission_id;
  if v_sub.id is null or v_sub.university_id <> public.current_university_id() then
    raise exception 'Submission not found';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'Submission already reviewed';
  end if;

  if v_sub.type = 'community' and public.current_app_role() <> 'admin' then
    raise exception 'Only an admin can review a community request';
  end if;

  if p_decision = 'reject' then
    update public.entity_submissions
    set status = 'rejected', reviewed_by = public.current_app_user_id(), reviewed_at = now()
    where id = p_submission_id;

    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (v_sub.university_id, public.current_app_user_id(), 'entity_submission_reject', v_sub.type, null,
      jsonb_build_object('submission_id', v_sub.id));
    return null;
  end if;

  if p_decision = 'duplicate' then
    if p_merge_into_id is null then
      raise exception 'duplicate decision requires p_merge_into_id';
    end if;
    update public.entity_submissions
    set status = 'duplicate', reviewed_by = public.current_app_user_id(), reviewed_at = now()
    where id = p_submission_id;

    insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
    values (v_sub.university_id, public.current_app_user_id(), 'entity_submission_duplicate', v_sub.type, p_merge_into_id,
      jsonb_build_object('submission_id', v_sub.id));
    return p_merge_into_id;
  end if;

  v_new_id := gen_random_uuid();

  if v_sub.type = 'professor' then
    insert into public.professors (id, university_id, first_name, last_name, department, slug)
    values (
      v_new_id, v_sub.university_id, v_sub.payload ->> 'first_name', v_sub.payload ->> 'last_name',
      v_sub.payload ->> 'department',
      public.slugify((v_sub.payload ->> 'first_name') || ' ' || (v_sub.payload ->> 'last_name'))
        || '-' || substr(v_new_id::text, 1, 6)
    );
    if jsonb_typeof(v_sub.payload -> 'course_codes') = 'array' then
      for v_code in select jsonb_array_elements_text(v_sub.payload -> 'course_codes')
      loop
        insert into public.professor_courses (professor_id, course_id)
        select v_new_id, c.id from public.courses c
        where c.university_id = v_sub.university_id and c.code = v_code
        on conflict do nothing;
      end loop;
    end if;
  elsif v_sub.type = 'course' then
    insert into public.courses (id, university_id, code, title, department, slug)
    values (
      v_new_id, v_sub.university_id, v_sub.payload ->> 'code', v_sub.payload ->> 'title',
      v_sub.payload ->> 'department', public.slugify(v_sub.payload ->> 'code')
    );
  elsif v_sub.type = 'community' then
    insert into public.communities (id, university_id, created_by, name, description, type, slug)
    values (
      v_new_id, v_sub.university_id, v_sub.submitted_by, v_sub.payload ->> 'name',
      nullif(v_sub.payload ->> 'description', ''), coalesce(v_sub.payload ->> 'type', 'public'),
      public.slugify(v_sub.payload ->> 'name') || '-' || substr(v_new_id::text, 1, 6)
    );
  end if;

  update public.entity_submissions
  set status = 'approved', reviewed_by = public.current_app_user_id(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_log (university_id, actor_id, action, target_type, target_id, metadata)
  values (v_sub.university_id, public.current_app_user_id(), 'entity_submission_approve', v_sub.type, v_new_id,
    jsonb_build_object('submission_id', v_sub.id));

  return v_new_id;
end;
$$;
