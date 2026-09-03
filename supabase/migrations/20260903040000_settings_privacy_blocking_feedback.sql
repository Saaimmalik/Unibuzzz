-- Settings/legal follow-up: self-service account deactivation/deletion,
-- granular email preferences, basic privacy controls, user-to-user blocking
-- (previously deferred, see HANDOFF.md §13), and a Feature request/Bug
-- report inbox. Decisions below were made explicitly with the founder
-- rather than assumed:
--   - email categories default OFF; only security/verification (Supabase
--     Auth emails, never touches this table) is mandatory.
--   - delete = anonymize + block login immediately (not a hard DELETE);
--     authored content stays in place, attributed to "Deleted User".
--   - deactivate = hides profile/content from others; logging back in
--     auto-reactivates.
--   - blocking = mutual content hiding (feed/communities/marketplace) AND
--     blocks starting/continuing a DM, both directions.

-- ---------------------------------------------------------------------------
-- 1. users: account-lifecycle status values, email/privacy preference columns
-- ---------------------------------------------------------------------------
alter table public.users drop constraint users_status_check;
alter table public.users add constraint users_status_check
  check (status in ('active', 'suspended', 'banned', 'deactivated', 'deleted'));

comment on column public.users.status is
  'active | suspended | banned | deactivated | deleted. suspended/banned are staff-only (moderation). deactivated/deleted are self-service (see deactivate_own_account/reactivate_own_account/delete_own_account) — enforced app-wide by RLS via public.is_active_user()/public.is_author_visible().';

alter table public.users
  add column who_can_message text not null default 'everyone'
    check (who_can_message in ('everyone', 'following', 'nobody')),
  add column hide_follow_counts boolean not null default false,
  -- Optional email categories, matching the Settings page's "Email
  -- preferences" section. All default OFF (opt-in), per the founder's
  -- explicit call — mirrors the existing "don't email someone for every
  -- like" principle this schema already applied to post_like/post_comment.
  -- Security/verification emails have no column here at all: they're
  -- Supabase Auth emails (signup/recovery/email-change/...), routed through
  -- functions/auth-email, always sent, never gated by user preference.
  add column email_pref_comments boolean not null default false,
  add column email_pref_likes boolean not null default false,
  add column email_pref_messages boolean not null default false,
  add column email_pref_community boolean not null default false,
  add column email_pref_marketplace boolean not null default false,
  add column email_pref_reviews boolean not null default false,
  add column email_pref_announcements boolean not null default false;

comment on column public.users.who_can_message is
  'Gates start_dm_conversation only (not marketplace chat, which is listing-initiated). everyone (default) | following (only people this user follows may message them) | nobody.';

-- ---------------------------------------------------------------------------
-- 2. Self-service account lifecycle: extend the existing self-escalation
-- guard (20260902280100_admin_only_status_changes.sql) to permit a narrow,
-- specific set of self-transitions, still blocking everything else
-- (self-suspend/ban is nonsensical; touching a deleted account further is
-- blocked — deletion is terminal).
-- ---------------------------------------------------------------------------
create or replace function public.prevent_protected_user_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_role text := public.current_app_role();
  acting_auth_id uuid := auth.uid();
  is_self boolean := old.auth_user_id = acting_auth_id;
begin
  if new.university_id is distinct from old.university_id then
    raise exception 'university_id cannot be changed';
  end if;

  if new.role is distinct from old.role then
    if acting_role <> 'admin' or is_self then
      raise exception 'only an admin can change another user''s role';
    end if;
  end if;

  if new.status is distinct from old.status then
    if is_self then
      if not (
        (old.status = 'active' and new.status = 'deactivated')
        or (old.status = 'deactivated' and new.status = 'active')
        or (old.status in ('active', 'deactivated') and new.status = 'deleted')
      ) then
        raise exception 'you can only deactivate, reactivate, or delete your own account';
      end if;
    elsif acting_role <> 'admin' then
      raise exception 'only an admin can suspend/ban another user, and never their own';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.deactivate_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set status = 'deactivated'
  where auth_user_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'Account is not currently active';
  end if;
end;
$$;

-- Called automatically by the frontend right after a successful sign-in if
-- the freshly-loaded profile is still 'deactivated' — "log back in to
-- reactivate" per the founder's chosen UX, no separate confirmation screen.
create or replace function public.reactivate_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set status = 'active'
  where auth_user_id = auth.uid() and status = 'deactivated';
  if not found then
    raise exception 'Account is not currently deactivated';
  end if;
end;
$$;

-- Anonymizes the app-layer profile row and blocks all future login checks
-- (see is_active_user/is_author_visible). Does NOT touch auth.users or
-- storage — that needs the service role, done by the delete-account edge
-- function (which calls this RPC first, then deletes the Supabase Auth user
-- and their avatar object). Authored content (posts/comments/reviews/
-- listings) is deliberately left in place, immutable-content convention as
-- always, now just attributed to "Deleted User".
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.users where auth_user_id = auth.uid();
  if v_id is null then
    raise exception 'Account not found';
  end if;

  update public.users
  set
    status = 'deleted',
    display_name = 'Deleted User',
    username = 'deleted-' || v_id,
    email = 'deleted-' || v_id || '@deleted.unibuzzz.local',
    bio = null,
    avatar_url = null,
    degree = null,
    grad_year = null,
    who_can_message = 'nobody',
    hide_follow_counts = false,
    email_pref_comments = false,
    email_pref_likes = false,
    email_pref_messages = false,
    email_pref_community = false,
    email_pref_marketplace = false,
    email_pref_reviews = false,
    email_pref_announcements = false
  where id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Author visibility: a deactivated user's own content/profile stays
-- visible to themselves and staff, but is hidden from everyone else. Deleted
-- accounts are NOT hidden this way — their (now-anonymized) content stays
-- visible per the founder's chosen deletion behavior.
-- ---------------------------------------------------------------------------
create or replace function public.is_author_visible(p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_author_id = public.current_app_user_id()
    or public.is_staff()
    or coalesce((select status <> 'deactivated' from public.users where id = p_author_id), false)
$$;

drop policy "users can read same-university profiles" on public.users;
create policy "users can read same-university profiles"
  on public.users for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (status <> 'deactivated' or auth_user_id = auth.uid() or public.is_staff())
  );

-- ---------------------------------------------------------------------------
-- 4. User-to-user blocking. Mutual content hiding (posts/comments/listings)
-- + blocks starting or continuing a DM, both directions — see
-- is_blocked_pair()/conversation_has_block() below. Follows the
-- community_members/review_votes/follows insert-or-delete convention: a
-- block is just a row that exists or doesn't.
-- ---------------------------------------------------------------------------
create table public.blocked_users (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocked_users_blocked_id_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

create policy "users can read their own blocks"
  on public.blocked_users for select
  to authenticated
  using (blocker_id = public.current_app_user_id());

create policy "users can block others"
  on public.blocked_users for insert
  to authenticated
  with check (
    blocker_id = public.current_app_user_id()
    and university_id = public.current_university_id()
    and exists (
      select 1 from public.users u
      where u.id = blocked_users.blocked_id and u.university_id = public.current_university_id()
    )
  );

create policy "users can unblock"
  on public.blocked_users for delete
  to authenticated
  using (blocker_id = public.current_app_user_id());

create or replace function public.is_blocked_pair(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  )
$$;

-- Used by the messages INSERT policy so a block placed *after* a
-- conversation already exists still stops further messages, in both
-- directions, without needing to know which participant is "the other one"
-- (works for any 1:1 conversation regardless of who sends).
create or replace function public.conversation_has_block(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp1
    join public.conversation_participants cp2
      on cp2.conversation_id = cp1.conversation_id and cp2.user_id <> cp1.user_id
    where cp1.conversation_id = p_conversation_id
      and public.is_blocked_pair(cp1.user_id, cp2.user_id)
  )
$$;

-- ---------------------------------------------------------------------------
-- 5. Apply author-visibility + block filtering to feed/marketplace SELECT
-- policies (drop + recreate, same idiom as 20260902280200). Staff and the
-- row's own author always see it; everyone else additionally needs the
-- author to be visible (not deactivated) and not blocked either direction.
-- ---------------------------------------------------------------------------
drop policy "posts are readable within the same university" on public.posts;
create policy "posts are readable within the same university"
  on public.posts for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (
      public.is_staff()
      or author_id = public.current_app_user_id()
      or (
        (deleted_at is null)
        and public.is_author_visible(author_id)
        and not public.is_blocked_pair(author_id, public.current_app_user_id())
      )
    )
  );

drop policy "comments are readable wherever the post is readable" on public.comments;
create policy "comments are readable wherever the post is readable"
  on public.comments for select
  to authenticated
  using (
    (
      public.is_staff()
      or author_id = public.current_app_user_id()
      or (
        deleted_at is null
        and public.is_author_visible(author_id)
        and not public.is_blocked_pair(author_id, public.current_app_user_id())
      )
    )
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.university_id = public.current_university_id()
        and (p.deleted_at is null or public.is_staff())
    )
  );

drop policy "listings are readable within the same university" on public.listings;
create policy "listings are readable within the same university"
  on public.listings for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (
      public.is_staff()
      or seller_id = public.current_app_user_id()
      or (
        status <> 'removed'
        and public.is_author_visible(seller_id)
        and not public.is_blocked_pair(seller_id, public.current_app_user_id())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Messaging: block starting a new DM, continuing an existing one, and
-- respect who_can_message. Marketplace chat deliberately doesn't check
-- who_can_message (listing-initiated, different context) but does still
-- check is_blocked_pair — a block is a block.
-- ---------------------------------------------------------------------------
create or replace function public.start_dm_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self uuid := public.current_app_user_id();
  v_other_university_id uuid;
  v_who_can_message text;
  v_conversation_id uuid;
begin
  if not public.is_active_user() or not public.is_verified_user() then
    raise exception 'Only verified, active accounts can message';
  end if;

  if p_other_user_id = v_self then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  if public.is_blocked_pair(v_self, p_other_user_id) then
    raise exception 'You can''t message this user';
  end if;

  select university_id, who_can_message into v_other_university_id, v_who_can_message
  from public.users where id = p_other_user_id;
  if v_other_university_id is null or v_other_university_id <> public.current_university_id() then
    raise exception 'User not found';
  end if;

  if v_who_can_message = 'nobody' then
    raise exception 'This user isn''t accepting messages';
  elsif v_who_can_message = 'following' and not exists (
    select 1 from public.follows where follower_id = p_other_user_id and following_id = v_self
  ) then
    raise exception 'This user only accepts messages from people they follow';
  end if;

  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id and cp2.user_id = p_other_user_id
  join public.conversations c on c.id = cp1.conversation_id and c.type = 'dm'
  where cp1.user_id = v_self
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (university_id, type)
  values (public.current_university_id(), 'dm')
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_self), (v_conversation_id, p_other_user_id);

  return v_conversation_id;
end;
$$;

create or replace function public.start_marketplace_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self uuid := public.current_app_user_id();
  v_seller_id uuid;
  v_university_id uuid;
  v_conversation_id uuid;
begin
  if not public.is_active_user() or not public.is_verified_user() then
    raise exception 'Only verified, active accounts can message';
  end if;

  select seller_id, university_id into v_seller_id, v_university_id
  from public.listings
  where id = p_listing_id and status <> 'removed';

  if v_seller_id is null or v_university_id <> public.current_university_id() then
    raise exception 'Listing not found';
  end if;

  if v_seller_id = v_self then
    raise exception 'Cannot start a conversation about your own listing';
  end if;

  if public.is_blocked_pair(v_self, v_seller_id) then
    raise exception 'You can''t message this seller';
  end if;

  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id and cp2.user_id = v_seller_id
  join public.conversations c on c.id = cp1.conversation_id and c.listing_id = p_listing_id
  where cp1.user_id = v_self
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (university_id, type, listing_id)
  values (public.current_university_id(), 'marketplace', p_listing_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_self), (v_conversation_id, v_seller_id);

  return v_conversation_id;
end;
$$;

drop policy "participants can send messages" on public.messages;
create policy "participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = public.current_app_user_id()
    and public.is_conversation_participant(conversation_id)
    and public.is_active_user()
    and public.is_verified_user()
    and not public.conversation_has_block(conversation_id)
  );

-- ---------------------------------------------------------------------------
-- 7. Feedback: Request a Feature / Report a Bug, submitted from the
-- Profile/Account section. Staff review from /admin/feedback (same
-- pending-queue pattern as reports/entity_submissions); founder also gets
-- an email per submission (see notify_new_feedback below).
-- ---------------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('feature_request', 'bug_report')),
  subject text not null check (char_length(subject) between 3 and 150),
  body text not null check (char_length(body) between 10 and 3000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_status_idx on public.feedback (status);

alter table public.feedback enable row level security;

create policy "users can read their own feedback, staff can read all"
  on public.feedback for select
  to authenticated
  using (user_id = public.current_app_user_id() or public.is_staff());

create policy "verified active users can submit feedback"
  on public.feedback for insert
  to authenticated
  with check (
    user_id = public.current_app_user_id()
    and university_id = public.current_university_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

create policy "staff can update feedback status"
  on public.feedback for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (public.is_staff() and university_id = public.current_university_id());

create or replace function public.prevent_feedback_content_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type is distinct from old.type
    or new.subject is distinct from old.subject
    or new.body is distinct from old.body
    or new.user_id is distinct from old.user_id
    or new.university_id is distinct from old.university_id then
    raise exception 'feedback content cannot be edited, only its status/note';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger feedback_protect_fields
  before update on public.feedback
  for each row
  execute function public.prevent_feedback_content_changes();

create or replace function public.notify_new_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.trigger_transactional_email(
    'feedback_new',
    'info@unibuzzz.com',
    'UniBuzzz Team',
    '/admin/feedback',
    new.type || ': ' || new.subject
  );
  return new;
end;
$$;

create trigger feedback_notify_new
  after insert on public.feedback
  for each row
  execute function public.notify_new_feedback();

-- ---------------------------------------------------------------------------
-- 8. Email preferences: extend create_notification with a p_email_category
-- parameter. When p_send_email is true, the email only actually goes out if
-- the recipient has that category's preference toggled on — the preference
-- check moves from each call site (previously a hardcoded true/false) into
-- this one shared function. New 8-arg overload; the existing 6-/7-arg ones
-- are left as-is (same "coexisting overloads" convention as
-- 20260903030000_email_notifications.sql).
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_university_id uuid,
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_link_path text,
  p_preview text,
  p_send_email boolean,
  p_email_category text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_enabled boolean;
begin
  if p_recipient_id = p_actor_id then
    return;
  end if;

  insert into public.notifications (university_id, recipient_id, actor_id, type, link_path, preview)
  values (p_university_id, p_recipient_id, p_actor_id, p_type, p_link_path, p_preview);

  if not p_send_email or p_email_category is null then
    return;
  end if;

  select
    email,
    display_name,
    case p_email_category
      when 'comments' then email_pref_comments
      when 'likes' then email_pref_likes
      when 'messages' then email_pref_messages
      when 'community' then email_pref_community
      when 'marketplace' then email_pref_marketplace
      when 'reviews' then email_pref_reviews
      when 'announcements' then email_pref_announcements
      else false
    end
  into v_email, v_name, v_enabled
  from public.users
  where id = p_recipient_id;

  if v_email is not null and coalesce(v_enabled, false) then
    perform public.trigger_transactional_email(p_type, v_email, v_name, p_link_path, p_preview);
  end if;
end;
$$;

revoke execute on function public.create_notification(uuid, uuid, uuid, text, text, text, boolean, text)
  from public, anon, authenticated;

-- Re-point every notify_* trigger at the 8-arg overload with the right
-- category, and turn email on (p_send_email := true) for the routine event
-- types too (post_like/post_comment/message/review_helpful) — they were
-- in-app-only before because there was no user-facing toggle yet; now that
-- there is, create_notification's own preference check (default OFF) is
-- what keeps this from spamming everyone the way the original comment
-- warned against.

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
    v_post.university_id, v_post.author_id, new.user_id, 'post_like', '/posts/' || v_post.id, null,
    true, 'likes'
  );

  return new;
end;
$$;

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
    '/posts/' || v_post.id, left(new.body, 140), true, 'comments'
  );

  return new;
end;
$$;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
  v_listing_id uuid;
  v_category text;
  v_recipient_id uuid;
begin
  select university_id, listing_id into v_university_id, v_listing_id
  from public.conversations where id = new.conversation_id;

  v_category := case when v_listing_id is null then 'messages' else 'marketplace' end;

  for v_recipient_id in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform public.create_notification(
      v_university_id, v_recipient_id, new.sender_id, 'message',
      '/messages/' || new.conversation_id, left(new.body, 140), true, v_category
    );
  end loop;

  return new;
end;
$$;

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
    v_review.university_id, v_review.reviewer_id, new.user_id, 'review_helpful', v_link, null,
    true, 'reviews'
  );

  return new;
end;
$$;

create or replace function public.notify_post_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null and public.is_staff() then
    perform public.create_notification(
      new.university_id, new.author_id, null, 'content_removed', '/posts/' || new.id, 'post',
      true, 'comments'
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
      v_university_id, new.author_id, null, 'content_removed', '/posts/' || new.post_id, 'comment',
      true, 'comments'
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
      new.university_id, new.seller_id, null, 'content_removed', '/marketplace/' || new.id, 'listing',
      true, 'marketplace'
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
      new.university_id, new.reviewer_id, null, 'content_removed', v_link, 'review',
      true, 'reviews'
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
        v_review.university_id, v_review.reviewer_id, null, 'content_removed', v_link, 'review',
        true, 'reviews'
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
  v_category text;
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

  v_category := case v_report.target_type
    when 'post' then 'comments'
    when 'comment' then 'comments'
    when 'listing' then 'marketplace'
    when 'message' then 'messages'
    when 'community' then 'community'
    else 'announcements'
  end;

  perform public.create_notification(
    v_report.university_id, v_report.reporter_id, null, 'report_resolved', '/notifications', p_decision,
    true, v_category
  );
end;
$$;

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
        '/communities', v_sub.payload ->> 'name', true, 'community'
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
      '/communities/' || v_slug, v_community_name, true, 'community'
    );
  end if;

  update public.entity_submissions
  set status = 'approved', reviewed_by = public.current_app_user_id(), reviewed_at = now()
  where id = p_submission_id;

  return v_new_id;
end;
$$;
