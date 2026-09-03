-- Resend integration, DB side. Two edge functions (supabase/functions/
-- auth-email, supabase/functions/send-app-email) do the actual sending;
-- this migration is the plumbing that lets Postgres fire the app-email one
-- from triggers/RPCs, plus a log table for the same "record every write"
-- discipline this schema already applies to audit_log/notifications.
--
-- Auth emails (signup/recovery/invite/email-change/magic-link/
-- reauthentication) don't touch this file at all — those go through
-- Supabase's Auth "Send Email" hook straight to functions/auth-email, wired
-- up in the dashboard, not from SQL.

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('auth', 'app')),
  event_type text not null,
  recipient_email text not null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  provider_message_id text
);

create index email_log_created_at_idx on public.email_log (created_at desc);
create index email_log_status_idx on public.email_log (status) where status = 'failed';

alter table public.email_log enable row level security;

-- Staff-only visibility, same convention as audit_log. No INSERT/UPDATE/
-- DELETE policy for anyone — every row is written by an edge function using
-- the service role key, which bypasses RLS entirely (see
-- supabase/functions/_shared/log.ts).
create policy "staff can read email log"
  on public.email_log for select
  to authenticated
  using (public.is_staff());

comment on table public.email_log is
  'Delivery log for every email Resend was asked to send (auth + app), written by the edge functions via service role. Read-only from the client, staff-only.';

-- ---------------------------------------------------------------------------
-- pg_net: lets a Postgres trigger/RPC fire an async HTTP request without
-- blocking the calling transaction on an external service's latency. Used
-- to invoke send-app-email. Enabled by default as an available extension on
-- Supabase-hosted projects.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net;

-- The project's functions base URL is derived from the project ref
-- (oaseqfvqdlvuhkcvobbg, see supabase/config.toml / HANDOFF.md §12 — this
-- ref is not secret, it's in the project's public URL). The actual secret
-- (a shared string also set as the send-app-email function's
-- INTERNAL_EMAIL_SECRET) is intentionally NOT in this file — it must be
-- stored once, manually, via:
--   select vault.create_secret('<same random string as INTERNAL_EMAIL_SECRET>', 'internal_email_secret');
-- so it never ends up committed to git. See the manual setup notes.
create or replace function public.trigger_transactional_email(
  p_type text,
  p_recipient_email text,
  p_recipient_name text,
  p_link_path text,
  p_preview text
)
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_secret text;
  v_base_url constant text := 'https://oaseqfvqdlvuhkcvobbg.supabase.co/functions/v1';
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'internal_email_secret'
  limit 1;

  if v_secret is null then
    raise warning 'trigger_transactional_email: vault secret "internal_email_secret" not configured, skipping email (type=%)', p_type;
    return;
  end if;

  perform net.http_post(
    url := v_base_url || '/send-app-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := jsonb_build_object(
      'type', p_type,
      'recipientEmail', p_recipient_email,
      'recipientName', p_recipient_name,
      'linkPath', p_link_path,
      'preview', p_preview
    )
  );
exception when others then
  -- An email failing to queue must never break the transaction that
  -- triggered it (a moderation action, a report resolution, ...) — same
  -- "email is best-effort, not a correctness dependency" principle as
  -- functions/_shared/log.ts on the edge-function side.
  raise warning 'trigger_transactional_email failed (type=%): %', p_type, sqlerrm;
end;
$$;

revoke execute on function public.trigger_transactional_email(text, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Wire create_notification() to optionally also send an email. Every
-- notification already funnels through this one function (see
-- 20260902290000_notifications.sql), so this is the single place to extend
-- rather than touching every notify_* trigger. p_send_email defaults to
-- false — existing call sites (post_like, post_comment, message,
-- review_helpful) are unchanged and stay in-app-only; only the "you might
-- miss this if you don't check the app" events below opt in.
--
-- Note: adding a parameter means this CREATE OR REPLACE defines a new
-- 7-argument overload alongside the original 6-argument
-- create_notification from 20260902290000_notifications.sql, which is left
-- untouched rather than rewritten here. That's intentional, not an
-- oversight: Postgres resolves a 6-arg call to the still-existing 6-arg
-- exact match, so notify_post_reaction/notify_post_comment/
-- notify_new_message/notify_review_helpful (unmodified below) keep working
-- exactly as before, while the 7-arg call sites below get the new
-- p_send_email behavior. Both overloads insert the same row shape; the only
-- difference is whether email is even an option.
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_university_id uuid,
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_link_path text,
  p_preview text,
  p_send_email boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
begin
  if p_recipient_id = p_actor_id then
    return;
  end if;

  insert into public.notifications (university_id, recipient_id, actor_id, type, link_path, preview)
  values (p_university_id, p_recipient_id, p_actor_id, p_type, p_link_path, p_preview);

  if p_send_email then
    select email, display_name into v_recipient from public.users where id = p_recipient_id;
    if v_recipient.email is not null then
      perform public.trigger_transactional_email(p_type, v_recipient.email, v_recipient.display_name, p_link_path, p_preview);
    end if;
  end if;
end;
$$;

revoke execute on function public.create_notification(uuid, uuid, uuid, text, text, text, boolean) from public, anon, authenticated;

-- Re-point the "important" notification triggers at p_send_email := true.
-- Bodies are otherwise identical to 20260902290000_notifications.sql — only
-- the trailing create_notification argument changed. Routine/high-volume
-- ones (post_like, post_comment, message, review_helpful) are deliberately
-- left alone to avoid emailing someone for every like or DM.

create or replace function public.notify_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and public.is_staff() then
    perform public.create_notification(
      new.university_id, new.author_id, null, 'content_removed', '/posts/' || new.id, 'post', true
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_comment_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
begin
  if new.deleted_at is not null and old.deleted_at is null and public.is_staff() then
    select university_id into v_university_id from public.posts where id = new.post_id;
    perform public.create_notification(
      v_university_id, new.author_id, null, 'content_removed', '/posts/' || new.post_id, 'comment', true
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'removed' and old.status <> 'removed' and public.is_staff() then
    perform public.create_notification(
      new.university_id, new.seller_id, null, 'content_removed', '/marketplace/' || new.id, 'listing', true
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_review_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text;
  v_slug text;
begin
  if new.status in ('hidden', 'removed') and old.status is distinct from new.status and public.is_staff() then
    if new.target_type = 'professor' then
      select slug into v_slug from public.professors where id = new.target_id;
      v_link := '/reviews/professors/' || v_slug;
    else
      select slug into v_slug from public.courses where id = new.target_id;
      v_link := '/reviews/courses/' || v_slug;
    end if;

    perform public.create_notification(
      new.university_id, new.reviewer_id, null, 'content_removed', v_link, 'review', true
    );
  end if;
  return new;
end;
$$;

create or replace function public.auto_hide_reported_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_count int;
  v_review record;
  v_link text;
  v_slug text;
begin
  select count(*) into v_report_count from public.review_reports where review_id = new.review_id;

  if v_report_count >= 2 then
    update public.reviews set status = 'hidden'
    where id = new.review_id and status = 'visible'
    returning id, university_id, reviewer_id, target_type, target_id into v_review;

    if found then
      if v_review.target_type = 'professor' then
        select slug into v_slug from public.professors where id = v_review.target_id;
        v_link := '/reviews/professors/' || v_slug;
      else
        select slug into v_slug from public.courses where id = v_review.target_id;
        v_link := '/reviews/courses/' || v_slug;
      end if;

      perform public.create_notification(
        v_review.university_id, v_review.reviewer_id, null, 'content_removed', v_link, 'review', true
      );
    end if;
  end if;

  return new;
end;
$$;

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

  perform public.create_notification(
    v_report.university_id, v_report.reporter_id, null, 'report_resolved', '/notifications', p_decision, true
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Community approval/rejection: entity_submissions never generated an
-- in-app notification at all before this (a real gap — the requester had no
-- way to find out except revisiting /communities). Add both types, and wire
-- admin_review_entity_submission's community branch to notify+email.
-- ---------------------------------------------------------------------------
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.notifications'::regclass
    and pg_get_constraintdef(oid) ilike '%type = any%post_like%';

  if v_conname is null then
    raise exception 'Could not find notifications.type check constraint to replace';
  end if;

  execute format('alter table public.notifications drop constraint %I', v_conname);
end $$;

alter table public.notifications
  add constraint notifications_type_check check (
    type in (
      'post_like', 'post_comment', 'message', 'review_helpful',
      'content_removed', 'report_resolved',
      'community_approved', 'community_rejected'
    )
  );

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
  v_community_name text;
  v_slug text;
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

    if v_sub.type = 'community' then
      perform public.create_notification(
        v_sub.university_id, v_sub.submitted_by, null, 'community_rejected',
        '/communities', v_sub.payload ->> 'name', true
      );
    end if;

    return null;
  end if;

  if p_decision = 'duplicate' then
    if p_merge_into_id is null then
      raise exception 'duplicate decision requires p_merge_into_id';
    end if;
    update public.entity_submissions
    set status = 'duplicate', reviewed_by = public.current_app_user_id(), reviewed_at = now()
    where id = p_submission_id;
    return p_merge_into_id;
  end if;

  -- p_decision = 'approve'
  v_new_id := gen_random_uuid();

  if v_sub.type = 'professor' then
    insert into public.professors (id, university_id, first_name, last_name, department, slug)
    values (
      v_new_id,
      v_sub.university_id,
      v_sub.payload ->> 'first_name',
      v_sub.payload ->> 'last_name',
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
      v_new_id,
      v_sub.university_id,
      v_sub.payload ->> 'code',
      v_sub.payload ->> 'title',
      v_sub.payload ->> 'department',
      public.slugify(v_sub.payload ->> 'code')
    );
  elsif v_sub.type = 'community' then
    v_community_name := v_sub.payload ->> 'name';
    v_slug := public.slugify(v_community_name) || '-' || substr(v_new_id::text, 1, 6);

    -- communities_after_insert_auto_join_owner (20260902230100_communities.sql)
    -- fires automatically here, making the requester the owner-member.
    insert into public.communities (id, university_id, created_by, name, description, type, slug)
    values (
      v_new_id,
      v_sub.university_id,
      v_sub.submitted_by,
      v_community_name,
      nullif(v_sub.payload ->> 'description', ''),
      coalesce(v_sub.payload ->> 'type', 'public'),
      v_slug
    );

    perform public.create_notification(
      v_sub.university_id, v_sub.submitted_by, null, 'community_approved',
      '/communities/' || v_slug, v_community_name, true
    );
  end if;

  update public.entity_submissions
  set status = 'approved', reviewed_by = public.current_app_user_id(), reviewed_at = now()
  where id = p_submission_id;

  return v_new_id;
end;
$$;
