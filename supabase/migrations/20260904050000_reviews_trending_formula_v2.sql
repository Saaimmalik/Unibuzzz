-- Refines the per-review contribution inside compute_trending_score
-- (20260902270200_reviews_trending.sql, already updated live by
-- 20260904010000_reviews_trending_live_update.sql) to the founder's new
-- weighting: helpful/engagement 40%, recency 35%, quality/completeness 25%.
-- The outer shape is unchanged — a target's trending_score is still the sum
-- of each of its visible reviews' contribution, so review *count* and
-- velocity still matter, not just per-review quality (same "explicitly not
-- just average rating" principle the feature started with). Only the
-- per-review weighting changes; CREATE OR REPLACE keeps the function's
-- existing callers (the trigger, the cron job) working unchanged.
--
-- helpful_term: capped at 5 helpful votes for full credit (0-1), rather
-- than an uncapped count, specifically so a handful of interactions can't
-- make one review dominate a target's score outright (the founder's
-- "prevent very-few-interaction reviews from dominating" ask) — capping
-- means a review needs a genuinely broad base of helpful votes, not just
-- one or two, to hit the ceiling of this term.
-- recency_term: unchanged half-life (10 days) from the original formula.
-- completeness_term: has a title (1/3), body substance capped at 500 chars
-- (1/3), and would_recommend answered (1/3) — a rough, cheap proxy for "is
-- this a real, filled-out review" without needing new columns.
create or replace function public.compute_trending_score(p_target_type text, p_target_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(
    0.40 * least(r.helpful_count::numeric / 5.0, 1)
    + 0.35 * power(0.5, extract(epoch from (now() - r.created_at)) / (10 * 86400))
    + 0.25 * (
      (case when r.title is not null and char_length(r.title) > 0 then 0.34 else 0 end)
      + least(char_length(r.body)::numeric / 500, 1) * 0.33
      + (case when r.would_recommend is not null then 0.33 else 0 end)
    )
  ), 0)
  from public.reviews r
  where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'visible'
$$;

select public.recompute_trending_scores();
