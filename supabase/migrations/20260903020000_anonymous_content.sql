-- Optional per-post/per-comment anonymity. Reuses the reviews anonymity
-- convention (author identity hidden from other students; staff can still
-- trace the real author for abuse handling) rather than inventing a new
-- one — see the comment on REVIEW_PUBLIC_SELECT in features/reviews/api.ts
-- and on ReviewPublic in packages/shared/src/types.ts.
--
-- Unlike reviews (always anonymous), posts/comments are anonymous only when
-- the poster opts in, so the same trick reviews uses (never SELECT
-- reviewer_id in the public query) can't apply as a static column
-- exclusion — a feed/community query returns a mix of anonymous and
-- non-anonymous rows in one request. author_id is always stored for real,
-- immutable like every other content field (needed for staff moderation
-- and so the poster's own client can still recognize/delete their own
-- anonymous post); the masking instead happens in the app layer at the
-- earliest point the data is read (features/feed/api.ts's
-- hydratePosts/fetchComments strip the author's name/avatar/username
-- before the row ever reaches a hook or component, for any row where
-- is_anonymous is true and the row isn't the viewer's own). Same
-- documented caveat as reviews.reviewer_id: this is an app-layer
-- guarantee, not a column-level RLS one (RLS is row-level only) — see
-- HANDOFF.md §11.
alter table public.posts add column is_anonymous boolean not null default false;
alter table public.comments add column is_anonymous boolean not null default false;

create or replace function public.prevent_post_body_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
    or new.university_id is distinct from old.university_id
    or new.author_id is distinct from old.author_id
    or new.community_id is distinct from old.community_id
    or new.is_anonymous is distinct from old.is_anonymous then
    raise exception 'posts can only be soft-deleted, not edited';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_comment_body_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
    or new.post_id is distinct from old.post_id
    or new.author_id is distinct from old.author_id
    or new.is_anonymous is distinct from old.is_anonymous then
    raise exception 'comments can only be soft-deleted, not edited';
  end if;
  return new;
end;
$$;

-- A comment-on-your-post notification must not leak an anonymous
-- commenter's identity to the post's author via the notification's actor
-- (the frontend already renders a null actor as a neutral icon, same as
-- content_removed/report_resolved). Also re-adds an explicit self-comment
-- skip: create_notification's own recipient==actor guard can't catch a
-- self-comment anymore once actor_id is nulled out for anonymity, so
-- without this an anonymous comment on your own post would incorrectly
-- notify you.
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
  if v_post.id is null or v_post.author_id = new.author_id then
    return new;
  end if;

  perform public.create_notification(
    v_post.university_id, v_post.author_id,
    case when new.is_anonymous then null else new.author_id end,
    'post_comment', '/posts/' || v_post.id, left(new.body, 140)
  );

  return new;
end;
$$;
