-- Adds the column deferred since posts didn't have communities to point
-- to yet (see the comment at the top of 20260902200000_posts.sql).
alter table public.posts add column community_id uuid references public.communities(id) on delete cascade;

create index posts_community_id_created_at_idx on public.posts (community_id, created_at desc);

-- Replaces the original SELECT/INSERT policies: community_id = null keeps
-- the old main-feed behavior unchanged; a non-null community_id adds two
-- rules — restricted communities are members-only to read, and posting
-- into any community (public or restricted) always requires membership.
drop policy "posts are readable within the same university" on public.posts;
create policy "posts are readable within the same university"
  on public.posts for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (deleted_at is null or public.is_staff() or author_id = public.current_app_user_id())
    and (
      community_id is null
      or exists (
        select 1 from public.communities c
        where c.id = posts.community_id
          and (
            c.type = 'public'
            or exists (
              select 1 from public.community_members cm
              where cm.community_id = c.id and cm.user_id = public.current_app_user_id()
            )
          )
      )
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
        where cm.community_id = posts.community_id and cm.user_id = public.current_app_user_id()
      )
    )
  );

-- Same body-only-immutable guard as before, extended to also block moving
-- a post between communities after the fact.
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
    or new.community_id is distinct from old.community_id then
    raise exception 'posts can only be soft-deleted, not edited';
  end if;
  return new;
end;
$$;
