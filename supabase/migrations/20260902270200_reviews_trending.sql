-- Trending score: explicitly NOT "highest average rating" (plan §8) — a
-- recency-decayed sum over each target's visible reviews, so recent review
-- velocity and engagement (helpful votes) both push a professor/course up,
-- while a target that was popular months ago but has gone quiet fades back
-- down over time. Half-life ~10 days. One tunable formula in one place, as
-- the plan asks for, so it's easy to adjust post-launch based on real
-- behavior without touching application code.
create or replace function public.compute_trending_score(p_target_type text, p_target_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(
    power(0.5, extract(epoch from (now() - r.created_at)) / (10 * 86400))
    * (1 + r.helpful_count * 0.2)
  ), 0)
  from public.reviews r
  where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'visible'
$$;

create or replace function public.recompute_trending_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professors p
  set trending_score = public.compute_trending_score('professor', p.id);

  update public.courses c
  set trending_score = public.compute_trending_score('course', c.id);
end;
$$;

-- pg_cron: recompute hourly rather than on every read (plan §8). If this
-- extension/schedule call isn't available on a given environment, the
-- trending rail still works off whatever trending_score was last set by a
-- manual `select public.recompute_trending_scores();` — it just won't decay
-- automatically on its own between reviews.
create extension if not exists pg_cron;

select cron.schedule(
  'recompute-review-trending-scores',
  '0 * * * *',
  $$select public.recompute_trending_scores();$$
);

-- Live-update professor/course pages when a new review lands (see
-- HANDOFF.md's realtime gotcha — tables must be added explicitly or
-- subscriptions silently never fire). Aggregates (professors/courses) are
-- trigger-maintained but not added here; the review list re-fetching on a
-- new review is enough to also show the updated count/rating.
alter publication supabase_realtime add table public.reviews;
