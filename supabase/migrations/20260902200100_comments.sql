-- parent_comment_id exists now (matches the agreed schema) but the MVP UI
-- only shows a flat list under each post — threaded replies are a later
-- build step, this just avoids a second migration to add the column then.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index comments_author_id_idx on public.comments (author_id);

alter table public.comments enable row level security;

-- Authors can still see their own soft-deleted comments — same reason as
-- posts' SELECT policy: Postgres RLS requires an UPDATE's resulting row to
-- satisfy SELECT too, so this is what makes the soft-delete itself work.
create policy "comments are readable wherever the post is readable"
  on public.comments for select
  to authenticated
  using (
    (deleted_at is null or public.is_staff() or author_id = public.current_app_user_id())
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.university_id = public.current_university_id()
        and (p.deleted_at is null or public.is_staff())
    )
  );

create policy "verified active users can comment"
  on public.comments for insert
  to authenticated
  with check (
    author_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and p.university_id = public.current_university_id()
        and p.deleted_at is null
    )
  );

create policy "authors can update own comments"
  on public.comments for update
  to authenticated
  using (author_id = public.current_app_user_id())
  with check (author_id = public.current_app_user_id());

create policy "staff can moderate comments in their university"
  on public.comments for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.university_id = public.current_university_id()
    )
  )
  with check (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.university_id = public.current_university_id()
    )
  );

create or replace function public.prevent_comment_body_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
    or new.post_id is distinct from old.post_id
    or new.author_id is distinct from old.author_id then
    raise exception 'comments can only be soft-deleted, not edited';
  end if;
  return new;
end;
$$;

create trigger comments_protect_fields
  before update on public.comments
  for each row
  execute function public.prevent_comment_body_changes();

-- Keeps posts.comment_count trigger-maintained rather than computed on read.
create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    update public.posts set comment_count = comment_count - 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  end if;
  return new;
end;
$$;

create trigger comments_sync_post_count
  after insert or update on public.comments
  for each row
  execute function public.sync_post_comment_count();
