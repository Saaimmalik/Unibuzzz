-- community_id is deliberately omitted here — communities don't exist yet
-- (a later build step). It gets added as a nullable FK once that table
-- exists, rather than pre-adding an unenforced column now.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.posts is
  'Main social feed posts. like_count/comment_count are trigger-maintained, not computed on read. Soft-deleted via deleted_at (not hard-deleted) so moderation keeps an audit trail.';

create index posts_university_id_created_at_idx on public.posts (university_id, created_at desc);
create index posts_author_id_idx on public.posts (author_id);

alter table public.posts enable row level security;

-- Authors can still see their own soft-deleted posts (matters for more than
-- UX: Postgres RLS implicitly requires an UPDATE's resulting row to satisfy
-- the SELECT policy too, so without `author_id = current_app_user_id()`
-- here, an author soft-deleting their own post would be silently blocked
-- by this same policy).
create policy "posts are readable within the same university"
  on public.posts for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (deleted_at is null or public.is_staff() or author_id = public.current_app_user_id())
  );

create policy "verified active users can create posts"
  on public.posts for insert
  to authenticated
  with check (
    university_id = public.current_university_id()
    and author_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

create policy "authors can update own posts"
  on public.posts for update
  to authenticated
  using (author_id = public.current_app_user_id())
  with check (author_id = public.current_app_user_id());

create policy "staff can moderate posts in their university"
  on public.posts for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (university_id = public.current_university_id());

-- No MVP edit feature: the only legitimate change to an existing post is
-- soft-deleting it (by the author or by staff moderating). Blocking every
-- other column change here, rather than in application code, means it's
-- enforced no matter which client calls the API.
create or replace function public.prevent_post_body_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
    or new.university_id is distinct from old.university_id
    or new.author_id is distinct from old.author_id then
    raise exception 'posts can only be soft-deleted, not edited';
  end if;
  return new;
end;
$$;

create trigger posts_protect_fields
  before update on public.posts
  for each row
  execute function public.prevent_post_body_changes();

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  type text not null default 'image' check (type in ('image')),
  position int not null default 0
);

create index post_media_post_id_idx on public.post_media (post_id);

alter table public.post_media enable row level security;

create policy "post media readable wherever the post is readable"
  on public.post_media for select
  to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.university_id = public.current_university_id()
        and (p.deleted_at is null or public.is_staff())
    )
  );

create policy "post authors can attach media to their own post"
  on public.post_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.author_id = public.current_app_user_id()
    )
  );
