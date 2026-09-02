create table public.communities (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  slug text not null,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  type text not null default 'public' check (type in ('public', 'restricted')),
  member_count int not null default 0,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (university_id, slug)
);

comment on table public.communities is
  'Reddit-style topic communities, scoped per university. type=public: anyone in the university can read posts without joining. type=restricted: only members can read posts. Posting always requires membership regardless of type.';

create index communities_university_id_idx on public.communities (university_id);

alter table public.communities enable row level security;

create policy "communities are readable within the same university"
  on public.communities for select
  to authenticated
  using (university_id = public.current_university_id());

create policy "verified active users can create communities"
  on public.communities for insert
  to authenticated
  with check (
    university_id = public.current_university_id()
    and created_by = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

-- No UPDATE/DELETE policy yet: editing/removing a community is a
-- moderation-dashboard feature that doesn't exist yet. Omitting the
-- policy denies it entirely for now rather than half-building it.

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'mod', 'owner')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_members_user_id_idx on public.community_members (user_id);

alter table public.community_members enable row level security;

create policy "community membership is readable within the same university"
  on public.community_members for select
  to authenticated
  using (
    exists (
      select 1 from public.communities c
      where c.id = community_members.community_id and c.university_id = public.current_university_id()
    )
  );

-- Joining: a user can only add themselves, and only as 'member' — 'owner'
-- is granted exclusively by communities_auto_join_owner below (a
-- SECURITY DEFINER trigger, which bypasses this policy), so a client can
-- never insert itself as owner/mod of a community it didn't create.
create policy "verified active users can join communities"
  on public.community_members for insert
  to authenticated
  with check (
    user_id = public.current_app_user_id()
    and role = 'member'
    and public.is_active_user()
    and public.is_verified_user()
    and exists (
      select 1 from public.communities c
      where c.id = community_members.community_id and c.university_id = public.current_university_id()
    )
  );

create policy "users can leave communities"
  on public.community_members for delete
  to authenticated
  using (user_id = public.current_app_user_id());

create or replace function public.sync_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities set member_count = member_count - 1 where id = old.community_id;
  end if;
  return null;
end;
$$;

create trigger community_members_sync_count
  after insert or delete on public.community_members
  for each row
  execute function public.sync_community_member_count();

-- Whoever creates a community is automatically its owner-member — without
-- this, the creator couldn't post in their own community (posting requires
-- membership, see 20260902230200_posts_community_column.sql).
create or replace function public.communities_auto_join_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger communities_after_insert_auto_join_owner
  after insert on public.communities
  for each row
  execute function public.communities_auto_join_owner();
