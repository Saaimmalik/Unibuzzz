-- No edit after creation (title/description/price/category/condition are
-- immutable), same convention as posts/comments/messages elsewhere in this
-- schema — only a status transition is allowed post-creation. A trigger
-- below enforces that.
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 2000),
  price_cents int not null check (price_cents >= 0),
  category text not null check (
    category in ('textbooks', 'electronics', 'furniture', 'clothing', 'tickets', 'housing', 'other')
  ),
  condition text not null check (condition in ('new', 'like_new', 'good', 'fair', 'poor')),
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  created_at timestamptz not null default now()
);

create index listings_university_id_created_at_idx on public.listings (university_id, created_at desc);
create index listings_seller_id_idx on public.listings (seller_id);
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);

alter table public.listings enable row level security;

-- Sellers can always see their own removed listings (same reasoning as the
-- posts/comments SELECT policies: an UPDATE's resulting row must still
-- satisfy SELECT, so without this a seller couldn't remove their own
-- listing — see HANDOFF.md's RLS+UPDATE gotcha).
create policy "listings are readable within the same university"
  on public.listings for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (status <> 'removed' or seller_id = public.current_app_user_id() or public.is_staff())
  );

create policy "verified active users can create listings"
  on public.listings for insert
  to authenticated
  with check (
    university_id = public.current_university_id()
    and seller_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

create policy "sellers can update own listing status"
  on public.listings for update
  to authenticated
  using (seller_id = public.current_app_user_id())
  with check (seller_id = public.current_app_user_id());

create policy "staff can moderate listings in their university"
  on public.listings for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (university_id = public.current_university_id());

create or replace function public.prevent_listing_content_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.price_cents is distinct from old.price_cents
    or new.category is distinct from old.category
    or new.condition is distinct from old.condition
    or new.university_id is distinct from old.university_id
    or new.seller_id is distinct from old.seller_id then
    raise exception 'listings cannot be edited after creation, only marked sold/removed';
  end if;
  return new;
end;
$$;

create trigger listings_protect_fields
  before update on public.listings
  for each row
  execute function public.prevent_listing_content_changes();

create table public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position int not null default 0
);

create index listing_media_listing_id_idx on public.listing_media (listing_id);

alter table public.listing_media enable row level security;

create policy "listing media readable wherever the listing is readable"
  on public.listing_media for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_media.listing_id
        and l.university_id = public.current_university_id()
        and (l.status <> 'removed' or l.seller_id = public.current_app_user_id() or public.is_staff())
    )
  );

create policy "sellers can attach media to their own listing"
  on public.listing_media for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_media.listing_id and l.seller_id = public.current_app_user_id()
    )
  );

-- Marketplace chat reuses the messaging schema built for DMs (step 9) —
-- conversations.type already supported 'marketplace', this just adds the
-- deferred FK now that listings exists (same pattern as posts.community_id).
alter table public.conversations add column listing_id uuid references public.listings(id) on delete set null;

create index conversations_listing_id_idx on public.conversations (listing_id) where listing_id is not null;

-- Dedupes per (buyer, seller, listing) — unlike DMs, a buyer messaging the
-- same seller about a different item should get a separate thread, since
-- the context (which item) matters here.
create or replace function public.start_marketplace_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self uuid := public.current_app_user_id();
  v_seller_id uuid;
  v_university_id uuid;
  v_conversation_id uuid;
begin
  if not public.is_active_user() or not public.is_verified_user() then
    raise exception 'Only verified, active accounts can message';
  end if;

  select seller_id, university_id into v_seller_id, v_university_id
  from public.listings
  where id = p_listing_id and status <> 'removed';

  if v_seller_id is null or v_university_id <> public.current_university_id() then
    raise exception 'Listing not found';
  end if;

  if v_seller_id = v_self then
    raise exception 'Cannot start a conversation about your own listing';
  end if;

  select cp1.conversation_id into v_conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id and cp2.user_id = v_seller_id
  join public.conversations c on c.id = cp1.conversation_id and c.listing_id = p_listing_id
  where cp1.user_id = v_self
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (university_id, type, listing_id)
  values (v_university_id, 'marketplace', p_listing_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conversation_id, v_self), (v_conversation_id, v_seller_id);

  return v_conversation_id;
end;
$$;

-- Private bucket, same path convention and reasoning as post-media.
insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', false)
on conflict (id) do nothing;

create policy "listing media readable within the same university"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[1] = public.current_university_id()::text
  );

create policy "sellers can upload listing media to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-media'
    and public.is_active_user()
    and public.is_verified_user()
    and (storage.foldername(name))[1] = public.current_university_id()::text
    and (storage.foldername(name))[2] = public.current_app_user_id()::text
  );

create policy "sellers can delete their own listing media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-media'
    and (storage.foldername(name))[2] = public.current_app_user_id()::text
  );

alter publication supabase_realtime add table public.listings;
