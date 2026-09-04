-- Trending posts, shared verbatim by the Feed's "Trending" tab and a
-- community's own "Hot" sort — both are just this one ORDER BY over rows in
-- the same `posts` table (community_id null vs a specific community_id), so
-- one formula/column serves both surfaces rather than building two.
--
-- Weighted engagement score: comments 35%, likes/upvotes 30%, views 20%,
-- recency 15% (founder-specified weights). Each raw count is log-damped
-- (ln(1+x)) so one viral outlier can't make a post's score dominate by
-- orders of magnitude the way raw counts would — same reasoning as
-- Reviews' trending formula avoiding a single high-vote review from
-- swamping everything else. Recency is expressed as a constant baseline
-- term (so a brand-new post with zero engagement still has a nonzero
-- score) that decays alongside the whole thing via a half-life multiplier
-- — same overall shape as compute_trending_score for Reviews, half-life
-- shortened to 36h since feed content churns far faster than a
-- professor/course review. Soft-deleted posts always score 0.
create or replace function public.compute_post_trending_score(p_post_id uuid)
returns numeric
language sql
stable
as $$
  select case
    when p.deleted_at is not null then 0
    else
      power(0.5, extract(epoch from (now() - p.created_at)) / (1.5 * 86400))
      * (
        0.35 * ln(1 + p.comment_count)
        + 0.30 * ln(1 + p.like_count)
        + 0.20 * ln(1 + p.view_count)
        + 0.15 * 10
      )
  end
  from public.posts p
  where p.id = p_post_id
$$;

alter table public.posts add column trending_score numeric not null default 0;

create index posts_trending_idx on public.posts (community_id, trending_score desc)
  where deleted_at is null;

-- Event-driven update (mirrors reviews_sync_trending_score): recomputes
-- just the one affected row whenever its engagement inputs change, so a new
-- post's trending_score is right immediately rather than waiting for the
-- hourly cron tick below. Scoped to the columns that actually feed the
-- formula so recomputing trending_score itself doesn't re-trigger.
create or replace function public.posts_sync_trending_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set trending_score = public.compute_post_trending_score(new.id)
  where id = new.id;

  return new;
end;
$$;

create trigger posts_sync_trending_score
  after insert or update of like_count, comment_count, view_count, deleted_at on public.posts
  for each row
  execute function public.posts_sync_trending_score();

-- Hourly decay-only safety net, same convention/cadence as Reviews' cron
-- job — a post with no new activity still needs its score to fade.
create or replace function public.recompute_post_trending_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set trending_score = public.compute_post_trending_score(id)
  where deleted_at is null;
end;
$$;

select cron.schedule(
  'recompute-post-trending-scores',
  '0 * * * *',
  $$select public.recompute_post_trending_scores();$$
);

select public.recompute_post_trending_scores();
