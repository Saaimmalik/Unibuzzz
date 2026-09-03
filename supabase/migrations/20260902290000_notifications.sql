-- Step 13: Notifications. One row per notification event, fed by triggers on
-- the tables that already generate them (reactions, comments, messages,
-- review_votes) plus moderation triggers and resolve_report — no new client
-- write path at all, matching the "SECURITY DEFINER trigger/RPC is the only
-- mutation path" pattern used throughout this schema (reactions ->
-- posts.like_count, resolve_report -> audit_log, etc).
--
-- link_path/preview are denormalized at insert time (same reasoning as
-- conversations.last_message_at/body in 20260902250000_messaging.sql: a
-- single query for the notifications list instead of an N+1 or a
-- type-dependent join per row client-side). `type` tells the frontend which
-- copy template to render; `preview` fills in the template's variable part
-- (a body snippet for post_comment/message, a decision word for
-- report_resolved, a content-type word for content_removed); `actor_id` is
-- null for system-originated notifications (moderation, report resolution)
-- so the client never has to special-case a missing actor to build the
-- sentence — a null actor is itself the signal that this was a system
-- action, not a person's.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  recipient_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  type text not null check (
    type in ('post_like', 'post_comment', 'message', 'review_helpful', 'content_removed', 'report_resolved')
  ),
  link_path text not null,
  preview text check (char_length(preview) <= 200),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_created_at_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_id_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "recipients can read their own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = public.current_app_user_id());

-- Only read_at may change (enforced below) — this is what lets a recipient
-- mark one or all of their notifications read.
create policy "recipients can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = public.current_app_user_id())
  with check (recipient_id = public.current_app_user_id());

-- No INSERT policy at all: every row is written by a SECURITY DEFINER
-- trigger/function below, which (like sync_post_like_count,
-- audit_log_user_change, etc. elsewhere in this schema) runs as the
-- table-owning migration role and so bypasses RLS entirely. A client can
-- never create a notification directly.

create or replace function public.prevent_notification_content_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.recipient_id is distinct from old.recipient_id
    or new.actor_id is distinct from old.actor_id
    or new.type is distinct from old.type
    or new.link_path is distinct from old.link_path
    or new.preview is distinct from old.preview
    or new.university_id is distinct from old.university_id then
    raise exception 'notifications can only be marked read';
  end if;
  return new;
end;
$$;

create trigger notifications_protect_fields
  before update on public.notifications
  for each row
  execute function public.prevent_notification_content_changes();

-- Shared insert helper for every trigger below — centralizes the
-- never-notify-yourself rule (a like/comment/vote on your own content, or a
-- report you filed against your own... well that can't happen, but the
-- guard is generically correct) in one place instead of repeating an `if`
-- in six trigger bodies.
--
-- Deliberately NOT callable by ordinary clients: unlike resolve_report/
-- admin_review_entity_submission (which are meant to be invoked via RPC and
-- gate themselves internally with is_staff() checks), this function has no
-- such check — it will happily insert whatever recipient/actor/link/preview
-- it's given. Every real caller is a trigger already holding the correct
-- values from the row that fired it, so the safe fix is to make it
-- uninvokable directly rather than add a check that has nothing meaningful
-- to verify.
create or replace function public.create_notification(
  p_university_id uuid,
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_link_path text,
  p_preview text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id = p_actor_id then
    return;
  end if;

  insert into public.notifications (university_id, recipient_id, actor_id, type, link_path, preview)
  values (p_university_id, p_recipient_id, p_actor_id, p_type, p_link_path, p_preview);
end;
$$;

revoke execute on function public.create_notification(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- post_like: a 'like' (main feed) or 'upvote' (community post) reaction.
-- Downvotes deliberately don't notify — same reasoning as most feed/forum
-- products, a negative signal isn't something to push to the recipient.
create or replace function public.notify_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
begin
  if new.target_type <> 'post' or new.type not in ('like', 'upvote') then
    return new;
  end if;

  select id, university_id, author_id into v_post from public.posts where id = new.target_id;
  if v_post.id is null then
    return new;
  end if;

  perform public.create_notification(
    v_post.university_id, v_post.author_id, new.user_id, 'post_like', '/posts/' || v_post.id, null
  );

  return new;
end;
$$;

create trigger reactions_notify_post_like
  after insert on public.reactions
  for each row
  execute function public.notify_post_reaction();

-- post_comment: notify the post's author when someone comments on it.
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post record;
begin
  select id, university_id, author_id into v_post from public.posts where id = new.post_id;
  if v_post.id is null then
    return new;
  end if;

  perform public.create_notification(
    v_post.university_id, v_post.author_id, new.author_id, 'post_comment',
    '/posts/' || v_post.id, left(new.body, 140)
  );

  return new;
end;
$$;

create trigger comments_notify_post_author
  after insert on public.comments
  for each row
  execute function public.notify_post_comment();

-- message: notify every other participant of the conversation (just the
-- one other person for a DM/marketplace thread — this schema has no group
-- chat — but written as a loop so it stays correct if that ever changes).
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
  v_recipient_id uuid;
begin
  select university_id into v_university_id from public.conversations where id = new.conversation_id;

  for v_recipient_id in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform public.create_notification(
      v_university_id, v_recipient_id, new.sender_id, 'message',
      '/messages/' || new.conversation_id, left(new.body, 140)
    );
  end loop;

  return new;
end;
$$;

create trigger messages_notify_recipient
  after insert on public.messages
  for each row
  execute function public.notify_new_message();

-- review_helpful: notify the review's author when someone marks it helpful.
-- Reviews are anonymous to other students, but the author obviously still
-- knows which reviews are theirs, so this doesn't leak anything new.
create or replace function public.notify_review_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review record;
  v_link text;
  v_slug text;
begin
  select id, university_id, reviewer_id, target_type, target_id into v_review
  from public.reviews where id = new.review_id;
  if v_review.id is null then
    return new;
  end if;

  if v_review.target_type = 'professor' then
    select slug into v_slug from public.professors where id = v_review.target_id;
    v_link := '/reviews/professors/' || v_slug;
  else
    select slug into v_slug from public.courses where id = v_review.target_id;
    v_link := '/reviews/courses/' || v_slug;
  end if;

  perform public.create_notification(
    v_review.university_id, v_review.reviewer_id, new.user_id, 'review_helpful', v_link, null
  );

  return new;
end;
$$;

create trigger review_votes_notify_author
  after insert on public.review_votes
  for each row
  execute function public.notify_review_helpful();

-- content_removed: notify the owner when staff moderate their content.
-- actor_id is left null on purpose (see the table comment) — the recipient
-- learns their content was removed, not who removed it, matching the same
-- "don't reveal the actor" instinct already applied to reporter anonymity.
create or replace function public.notify_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and public.is_staff() then
    perform public.create_notification(
      new.university_id, new.author_id, null, 'content_removed', '/posts/' || new.id, 'post'
    );
  end if;
  return new;
end;
$$;

create trigger posts_notify_moderation
  after update of deleted_at on public.posts
  for each row
  execute function public.notify_post_moderation();

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
      v_university_id, new.author_id, null, 'content_removed', '/posts/' || new.post_id, 'comment'
    );
  end if;
  return new;
end;
$$;

create trigger comments_notify_moderation
  after update of deleted_at on public.comments
  for each row
  execute function public.notify_comment_moderation();

create or replace function public.notify_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'removed' and old.status <> 'removed' and public.is_staff() then
    perform public.create_notification(
      new.university_id, new.seller_id, null, 'content_removed', '/marketplace/' || new.id, 'listing'
    );
  end if;
  return new;
end;
$$;

create trigger listings_notify_moderation
  after update of status on public.listings
  for each row
  execute function public.notify_listing_moderation();

-- Covers both a direct staff moderation action (status -> hidden/removed
-- while is_staff()) and leaves the report-driven auto-hide path (system,
-- not staff) to auto_hide_reported_review below, which notifies separately
-- since public.is_staff() would be false in that trigger context.
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
      new.university_id, new.reviewer_id, null, 'content_removed', v_link, 'review'
    );
  end if;
  return new;
end;
$$;

create trigger reviews_notify_moderation
  after update of status on public.reviews
  for each row
  execute function public.notify_review_moderation();

-- Extends the existing report-driven auto-hide trigger (20260902270000) to
-- also notify the review's author once it actually flips to hidden — a
-- system action (not staff), so it can't go through
-- notify_review_moderation above (which requires is_staff()).
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
        v_review.university_id, v_review.reviewer_id, null, 'content_removed', v_link, 'review'
      );
    end if;
  end if;

  return new;
end;
$$;

-- report_resolved: notify the reporter. Deliberately no deep link to the
-- reported target — by the time a report is resolved the target may itself
-- have just been removed/hidden, so linking to it is as likely to 404 as
-- not; the notification is informational (what was decided), not a
-- navigation prompt. link_path points at the notifications list itself.
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
    v_report.university_id, v_report.reporter_id, null, 'report_resolved', '/notifications', p_decision
  );
end;
$$;

alter publication supabase_realtime add table public.notifications;
