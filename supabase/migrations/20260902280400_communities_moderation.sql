alter table public.communities
  add column status text not null default 'active' check (status in ('active', 'locked', 'removed'));

comment on column public.communities.status is
  'active: normal. locked: staff-moderated read-only — still visible to everyone, blocks new posts/joins. removed: staff-moderated takedown — hidden from general browse, still visible to its creator/staff for audit. Distinct from entity_submissions.status, which governs the CREATE-time approval queue before a community row exists at all.';

-- Removed communities stay visible to their creator/staff (same "an
-- UPDATE's resulting row must satisfy SELECT" reasoning used throughout
-- this schema); locked communities stay visible to everyone.
drop policy "communities are readable within the same university" on public.communities;
create policy "communities are readable within the same university"
  on public.communities for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (status <> 'removed' or public.is_staff() or created_by = public.current_app_user_id())
  );

create policy "staff can moderate communities in their university"
  on public.communities for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (public.is_staff() and university_id = public.current_university_id());

create or replace function public.prevent_community_content_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name
    or new.description is distinct from old.description
    or new.type is distinct from old.type
    or new.slug is distinct from old.slug
    or new.university_id is distinct from old.university_id
    or new.created_by is distinct from old.created_by then
    raise exception 'communities cannot be edited after creation, only moderated (status)';
  end if;
  return new;
end;
$$;

create trigger communities_protect_fields
  before update on public.communities
  for each row
  execute function public.prevent_community_content_changes();

-- Locked/removed communities can't be joined or posted into. Re-creates the
-- two existing policies (20260902230100_communities.sql,
-- 20260902230200_posts_community_column.sql) with a status='active' check
-- added.
drop policy "verified active users can join communities" on public.community_members;
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
      where c.id = community_members.community_id
        and c.university_id = public.current_university_id()
        and c.status = 'active'
    )
  );

drop policy "verified active users can create posts" on public.posts;
create policy "verified active users can create posts"
  on public.posts for insert
  to authenticated
  with check (
    university_id = public.current_university_id()
    and author_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
    and (
      community_id is null
      or exists (
        select 1 from public.community_members cm
        join public.communities c on c.id = cm.community_id
        where cm.community_id = posts.community_id
          and cm.user_id = public.current_app_user_id()
          and c.status = 'active'
      )
    )
  );
