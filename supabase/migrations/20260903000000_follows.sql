-- Instagram-style follow graph. Mirrors the community_members/review_votes
-- insert-or-delete pattern (see AGENTS.md): a follow is just a row that
-- exists or doesn't, not a status field — follow = insert, unfollow =
-- delete. No immutable-content concern applies here, unlike posts/comments.
create table public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

comment on table public.follows is
  'follower_id follows following_id. university_id is denormalized from both users (who are always same-university, since cross-university users profiles are never readable per RLS on public.users) purely so RLS here can check current_university_id() directly, same reasoning as posts/reviews.';

-- Reverse-direction lookups (a profile's follower list, and the Following
-- feed tab's "which authors do I follow" query) are the hot path; the
-- primary key already covers "who does X follow" lookups.
create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

create policy "follows are readable within the same university"
  on public.follows for select
  to authenticated
  using (university_id = public.current_university_id());

create policy "verified active users can follow others"
  on public.follows for insert
  to authenticated
  with check (
    follower_id = public.current_app_user_id()
    and university_id = public.current_university_id()
    and public.is_active_user()
    and public.is_verified_user()
    and exists (
      select 1 from public.users u
      where u.id = follows.following_id and u.university_id = public.current_university_id()
    )
  );

create policy "users can unfollow"
  on public.follows for delete
  to authenticated
  using (follower_id = public.current_app_user_id());

-- Trigger-maintained, same convention as posts.like_count/comment_count and
-- communities.member_count — avoids a count(*) on every profile view.
alter table public.users
  add column follower_count int not null default 0,
  add column following_count int not null default 0;

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.users set following_count = following_count + 1 where id = new.follower_id;
    update public.users set follower_count = follower_count + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.users set following_count = following_count - 1 where id = old.follower_id;
    update public.users set follower_count = follower_count - 1 where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger follows_sync_counts
  after insert or delete on public.follows
  for each row
  execute function public.sync_follow_counts();
