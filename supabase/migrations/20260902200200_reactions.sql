-- One polymorphic table for both the feed's "like" and communities'
-- future up/down voting (per the agreed schema), rather than a dedicated
-- likes table now and a second one later. A user has at most one reaction
-- per target; liking = insert, unliking = delete (no toggling type in MVP,
-- only 'like' is used until communities land).
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('like', 'upvote', 'downvote')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

create index reactions_target_idx on public.reactions (target_type, target_id);

alter table public.reactions enable row level security;

-- target_id is polymorphic (no FK possible), so this trigger is what
-- actually stops a user from reacting to a target outside their own
-- university — RLS policies alone can't express a cross-table, per-row
-- check like this.
create or replace function public.validate_reaction_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
begin
  if new.target_type = 'post' then
    select university_id into v_university_id
    from public.posts where id = new.target_id and deleted_at is null;
  elsif new.target_type = 'comment' then
    select p.university_id into v_university_id
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.id = new.target_id and c.deleted_at is null;
  end if;

  if v_university_id is null or v_university_id <> public.current_university_id() then
    raise exception 'Invalid reaction target';
  end if;

  return new;
end;
$$;

create trigger reactions_validate_target
  before insert on public.reactions
  for each row
  execute function public.validate_reaction_target();

create policy "reactions are readable within the same university"
  on public.reactions for select
  to authenticated
  using (
    (target_type = 'post' and exists (
      select 1 from public.posts p where p.id = target_id and p.university_id = public.current_university_id()
    ))
    or (target_type = 'comment' and exists (
      select 1 from public.comments c join public.posts p on p.id = c.post_id
      where c.id = target_id and p.university_id = public.current_university_id()
    ))
  );

create policy "verified active users can react"
  on public.reactions for insert
  to authenticated
  with check (user_id = public.current_app_user_id() and public.is_active_user() and public.is_verified_user());

create policy "users can remove their own reaction"
  on public.reactions for delete
  to authenticated
  using (user_id = public.current_app_user_id());

-- Keeps posts.like_count trigger-maintained. Only post likes affect a
-- counter today; comment reactions have nowhere to display a count yet.
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.target_type = 'post' and new.type = 'like' then
    update public.posts set like_count = like_count + 1 where id = new.target_id;
  elsif tg_op = 'DELETE' and old.target_type = 'post' and old.type = 'like' then
    update public.posts set like_count = like_count - 1 where id = old.target_id;
  end if;
  return null;
end;
$$;

create trigger reactions_sync_post_like_count
  after insert or delete on public.reactions
  for each row
  execute function public.sync_post_like_count();
