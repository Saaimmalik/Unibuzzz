-- View-count tracking for posts and listings, needed as an engagement
-- signal for the trending formulas added in the migrations that follow this
-- one. Simple increment-per-page-visit, not a deduped-per-viewer count (no
-- new `post_views`/`listing_views` table) — matches the pragmatic level of
-- this codebase's other counters (like_count/comment_count/member_count),
-- and view counts aren't a security- or money-sensitive number, so a
-- client refreshing the page a few times inflating it slightly is an
-- accepted tradeoff, not a bug. The frontend does a best-effort
-- once-per-browser-session guard (sessionStorage) to keep it sane in the
-- common case, but that's a UX nicety, not a server-enforced boundary.

alter table public.posts add column view_count int not null default 0;
alter table public.listings add column view_count int not null default 0;

-- SECURITY DEFINER so an authenticated viewer (who only has SELECT via RLS,
-- no UPDATE grant) can still bump the counter; scoped to their own
-- university via current_university_id() the same way every other
-- SECURITY DEFINER helper in this schema is, so this can't be used to
-- tamper with another university's rows even though it bypasses RLS.
create or replace function public.increment_post_view(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set view_count = view_count + 1
  where id = p_post_id
    and university_id = public.current_university_id()
    and deleted_at is null;
end;
$$;

create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set view_count = view_count + 1
  where id = p_listing_id
    and university_id = public.current_university_id();
end;
$$;
