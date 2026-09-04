-- Trending listings for Marketplace. Listings have no likes/comments, so
-- the engagement signal is buyer interest: `inquiry_count`, the number of
-- distinct buyers who've messaged about the listing. start_marketplace_
-- conversation() already dedupes one conversation per buyer+listing pair
-- (see 20260902260000_marketplace.sql), so counting conversation inserts
-- with a listing_id is exactly counting distinct interested buyers, not
-- raw message volume (a buyer sending 10 messages about one listing isn't
-- 10x the signal of 10 different buyers each sending 1).
alter table public.listings add column inquiry_count int not null default 0;

create or replace function public.listings_increment_inquiry_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.listing_id is not null then
    update public.listings set inquiry_count = inquiry_count + 1 where id = new.listing_id;
  end if;
  return new;
end;
$$;

create trigger conversations_sync_listing_inquiry_count
  after insert on public.conversations
  for each row
  execute function public.listings_increment_inquiry_count();

-- Weighted score: inquiries 50%, views 30%, recency 20% (founder-specified
-- weights) — same log-damping + decayed-baseline-recency shape as
-- compute_post_trending_score, half-life 3 days (buyer interest in a
-- specific item fades faster than social content, and items get sold).
-- Only 'active' listings are eligible (mirrors the existing "browse is
-- active-only" convention — sold/removed listings always score 0, which
-- also covers "reported and removed" since a report resolution that acts
-- on a listing sets status to 'removed', the only moderation path that
-- exists for listings today).
create or replace function public.compute_listing_trending_score(p_listing_id uuid)
returns numeric
language sql
stable
as $$
  select case
    when l.status <> 'active' then 0
    else
      power(0.5, extract(epoch from (now() - l.created_at)) / (3 * 86400))
      * (
        0.50 * ln(1 + l.inquiry_count)
        + 0.30 * ln(1 + l.view_count)
        + 0.20 * 10
      )
  end
  from public.listings l
  where l.id = p_listing_id
$$;

alter table public.listings add column trending_score numeric not null default 0;

create index listings_trending_idx on public.listings (trending_score desc)
  where status = 'active';

create or replace function public.listings_sync_trending_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set trending_score = public.compute_listing_trending_score(new.id)
  where id = new.id;

  return new;
end;
$$;

create trigger listings_sync_trending_score
  after insert or update of inquiry_count, view_count, status on public.listings
  for each row
  execute function public.listings_sync_trending_score();

create or replace function public.recompute_listing_trending_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set trending_score = public.compute_listing_trending_score(id)
  where status = 'active';
end;
$$;

select cron.schedule(
  'recompute-listing-trending-scores',
  '0 * * * *',
  $$select public.recompute_listing_trending_scores();$$
);

select public.recompute_listing_trending_scores();
