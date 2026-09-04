-- Fixes Trending/Most-Reviewed rails not reflecting real professors/courses.
--
-- Root cause: trending_score was cron-only (recompute_trending_scores() ran
-- hourly via pg_cron, see 20260902270200_reviews_trending.sql) with no
-- trigger updating it on insert/status-change, unlike review_count/avg_rating
-- which are trigger-maintained (reviews_sync_aggregates). Before today,
-- almost every review sat in status='pending' (new accounts are "low trust"
-- for 3 days, see reviews_apply_trust_and_pii_gate pre-this-migration), so
-- trending_score staying stale was invisible — there was nothing to show
-- either way. 20260904000000_reviews_publish_immediately.sql bulk-flipped
-- that entire backlog to status='visible' in one UPDATE; review_count/
-- avg_rating updated instantly (their trigger fires on every insert/status
-- update), but trending_score didn't move until the next hourly cron tick —
-- and any review submitted between ticks stays invisible in Trending for up
-- to an hour, indefinitely, since nothing else ever recomputes it.

-- 1. Backfill immediately so today's now-visible backlog shows up now,
-- instead of waiting for the next hourly tick.
select public.recompute_trending_scores();

-- 2. Make trending_score event-driven going forward, same as review_count/
-- avg_rating, rather than relying solely on the hourly cron job. Recomputes
-- just the one affected professor/course row (not a full table scan like
-- recompute_trending_scores()) on every insert and on every status or
-- helpful_count change — status changes cover hide/remove/restore, and
-- helpful_count changes cover review_votes' sync_review_helpful_count()
-- (which itself is an UPDATE on reviews, so it fires this trigger too). The
-- hourly cron job is left in place as a safety net for the score's time
-- decay (a review with zero new activity still needs to fade even though
-- nothing about that row ever changes).
create or replace function public.reviews_sync_trending_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.target_type = 'professor' then
    update public.professors
    set trending_score = public.compute_trending_score('professor', new.target_id)
    where id = new.target_id;
  elsif new.target_type = 'course' then
    update public.courses
    set trending_score = public.compute_trending_score('course', new.target_id)
    where id = new.target_id;
  end if;

  return new;
end;
$$;

create trigger reviews_sync_trending_score
  after insert or update of status, helpful_count on public.reviews
  for each row
  execute function public.reviews_sync_trending_score();
