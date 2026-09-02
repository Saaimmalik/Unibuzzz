-- Rate My Professor / Rate My Course core schema. Professors and courses are
-- centrally managed (see AGENTS.md / HANDOFF.md §11 of the plan) — there is
-- deliberately no client INSERT/UPDATE policy on either table below. The
-- only way rows get created is (a) a seed migration, which runs as the
-- privileged migration role and bypasses RLS entirely, or (b) the staff-only
-- `admin_review_entity_submission` RPC in the next migration. This is a
-- stronger guarantee than an app-level "don't show the create button."

-- Small SQL port of packages/shared/src/format.ts's slugify(), needed
-- server-side for slugs generated inside admin_review_entity_submission.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'))
$$;

create table public.professors (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  department text not null check (char_length(department) between 1 and 120),
  slug text not null,
  review_count int not null default 0,
  avg_rating numeric(3, 2) not null default 0,
  trending_score numeric not null default 0,
  -- Self-referencing: when two entries for the same person get created by
  -- mistake, staff merge one into the other rather than deleting it (so
  -- existing reviews aren't orphaned and old links keep resolving).
  merged_into_id uuid references public.professors(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (university_id, slug)
);

create index professors_university_id_idx on public.professors (university_id);
create index professors_trending_idx on public.professors (university_id, trending_score desc);
create index professors_name_trgm_idx
  on public.professors using gin ((first_name || ' ' || last_name) gin_trgm_ops);

alter table public.professors enable row level security;

create policy "professors are readable within the same university"
  on public.professors for select
  to authenticated
  using (university_id = public.current_university_id());

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  code text not null check (char_length(code) between 1 and 20),
  title text not null check (char_length(title) between 1 and 160),
  department text not null check (char_length(department) between 1 and 120),
  slug text not null,
  review_count int not null default 0,
  avg_rating numeric(3, 2) not null default 0,
  trending_score numeric not null default 0,
  merged_into_id uuid references public.courses(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (university_id, slug),
  unique (university_id, code)
);

create index courses_university_id_idx on public.courses (university_id);
create index courses_trending_idx on public.courses (university_id, trending_score desc);
create index courses_code_title_trgm_idx
  on public.courses using gin ((code || ' ' || title) gin_trgm_ops);

alter table public.courses enable row level security;

create policy "courses are readable within the same university"
  on public.courses for select
  to authenticated
  using (university_id = public.current_university_id());

-- "teaches CS101, CS202" mapping. Same centrally-managed reasoning as
-- above, but light enough that staff get a direct policy rather than
-- needing a dedicated RPC.
create table public.professor_courses (
  professor_id uuid not null references public.professors(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (professor_id, course_id)
);

alter table public.professor_courses enable row level security;

create policy "professor_courses are readable within the same university"
  on public.professor_courses for select
  to authenticated
  using (
    exists (
      select 1 from public.professors p
      where p.id = professor_courses.professor_id and p.university_id = public.current_university_id()
    )
  );

create policy "staff can manage professor_courses in their university"
  on public.professor_courses for all
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.professors p
      where p.id = professor_courses.professor_id and p.university_id = public.current_university_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.professors p
      join public.courses c on c.university_id = p.university_id
      where p.id = professor_courses.professor_id and c.id = professor_courses.course_id
        and p.university_id = public.current_university_id()
    )
  );

-- Reviewer identity is stored (needed for the one-review-per-target
-- constraint, self soft-delete, and moderator abuse investigation) but is
-- deliberately never selected by the app's public list/detail queries —
-- reviews read as "Verified Student" to other students, matching the plan's
-- "anonymous-to-other-students by default, visible to mods only" rule. This
-- is an application-layer guarantee, not an RLS column-level one (Postgres
-- RLS is row-level; a real column-level split would need a second
-- SECURITY DEFINER read surface — noted as a good follow-up alongside the
-- general moderation system in step 14, not built here).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('professor', 'course')),
  target_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text not null check (char_length(body) between 15 and 3000),
  tags text[] not null default '{}',
  would_recommend boolean,
  helpful_count int not null default 0,
  -- pending: awaiting mod review (low-trust author or PII/harassment flag).
  -- visible: shown publicly. hidden: auto-hidden by report threshold or a
  -- mod action. removed: the author's own soft-delete.
  status text not null default 'visible' check (status in ('pending', 'visible', 'hidden', 'removed')),
  flagged_pii boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.reviews is
  'Immutable once created (see reviews_protect_fields below) — only status may change. A removed review does not block a fresh one: see reviews_one_active_per_target, the partial unique index below.';

-- Excludes removed reviews so a user who removes their own review can
-- submit a new one for the same target, without allowing two *active*
-- reviews of the same target by the same person.
create unique index reviews_one_active_per_target
  on public.reviews (reviewer_id, target_type, target_id)
  where status <> 'removed';

create index reviews_target_idx on public.reviews (target_type, target_id, created_at desc);
create index reviews_university_id_idx on public.reviews (university_id);

alter table public.reviews enable row level security;

-- Reviewers can still see their own pending/hidden/removed reviews (same
-- RLS+UPDATE reasoning repeated throughout this schema: an UPDATE's
-- resulting row must still satisfy SELECT, or the reviewer's own
-- self-removal would be silently blocked).
create policy "visible reviews are readable within the same university"
  on public.reviews for select
  to authenticated
  using (
    university_id = public.current_university_id()
    and (status = 'visible' or public.is_staff() or reviewer_id = public.current_app_user_id())
  );

create policy "verified active users can submit reviews"
  on public.reviews for insert
  to authenticated
  with check (
    university_id = public.current_university_id()
    and reviewer_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

create policy "reviewers can remove their own review"
  on public.reviews for update
  to authenticated
  using (reviewer_id = public.current_app_user_id())
  with check (reviewer_id = public.current_app_user_id() and status = 'removed');

create policy "staff can moderate reviews in their university"
  on public.reviews for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (university_id = public.current_university_id());

-- Validates the polymorphic target (no FK possible, same reasoning as
-- reactions.validate_reaction_target) and blocks reviewing an entity that
-- has since been merged into another one.
create or replace function public.validate_review_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
  v_merged_into uuid;
begin
  if new.target_type = 'professor' then
    select university_id, merged_into_id into v_university_id, v_merged_into
    from public.professors where id = new.target_id;
  elsif new.target_type = 'course' then
    select university_id, merged_into_id into v_university_id, v_merged_into
    from public.courses where id = new.target_id;
  end if;

  if v_university_id is null or v_university_id <> public.current_university_id() then
    raise exception 'Invalid review target';
  end if;

  if v_merged_into is not null then
    raise exception 'This entry has been merged — review the merged entry instead';
  end if;

  return new;
end;
$$;

create trigger reviews_validate_target
  before insert on public.reviews
  for each row
  execute function public.validate_review_target();

-- Automated PII/trust gate (plan §8: "professors are named individuals,
-- this is the platform's highest legal/reputational risk area"). Overwrites
-- whatever status the client sent — a brand-new account (<3 days old) or a
-- body that looks like it contains an email/phone number always starts
-- pending, no matter what. Kept as one plain-Postgres regex check rather
-- than an Edge Function, consistent with this repo's "no application
-- server, business logic lives in Postgres" convention.
create or replace function public.reviews_apply_trust_and_pii_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_low_trust boolean;
  v_pii boolean;
begin
  select (created_at > now() - interval '3 days') into v_low_trust
  from public.users where id = new.reviewer_id;

  v_pii := (
    new.body ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    or new.body ~ '(\+?[0-9][\s.-]?){7,}'
    or coalesce(new.title, '') ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
  );

  new.flagged_pii := v_pii;
  new.status := case when v_pii or coalesce(v_low_trust, true) then 'pending' else 'visible' end;

  return new;
end;
$$;

create trigger reviews_before_insert_gate
  before insert on public.reviews
  for each row
  execute function public.reviews_apply_trust_and_pii_gate();

-- Content is immutable — only `status` (and the system-maintained
-- `helpful_count`) may change after creation, matching the immutable-
-- content convention used for posts/comments/messages/listings. The
-- pg_trigger_depth() check on helpful_count is what lets the review_votes
-- trigger below (which itself fires this same BEFORE UPDATE trigger, one
-- level deeper) update the counter while still blocking a direct client
-- PATCH of helpful_count.
create or replace function public.prevent_review_content_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.helpful_count is distinct from old.helpful_count and pg_trigger_depth() <= 1 then
    raise exception 'helpful_count is system-maintained';
  end if;

  if new.rating is distinct from old.rating
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.tags is distinct from old.tags
    or new.would_recommend is distinct from old.would_recommend
    or new.flagged_pii is distinct from old.flagged_pii
    or new.target_type is distinct from old.target_type
    or new.target_id is distinct from old.target_id
    or new.university_id is distinct from old.university_id
    or new.reviewer_id is distinct from old.reviewer_id then
    raise exception 'reviews cannot be edited after creation, only removed (status) or moderated';
  end if;

  return new;
end;
$$;

create trigger reviews_protect_fields
  before update on public.reviews
  for each row
  execute function public.prevent_review_content_changes();

-- avg_rating/review_count are recomputed from scratch (not incremented)
-- whenever a review is inserted/deleted or its status changes — simpler
-- and less bug-prone than incremental float math, and cheap enough at this
-- scale. Only status='visible' reviews count, so pending/hidden/removed
-- reviews never affect the public aggregate.
create or replace function public.sync_review_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_type text := coalesce(new.target_type, old.target_type);
  v_target_id uuid := coalesce(new.target_id, old.target_id);
  v_count int;
  v_avg numeric;
begin
  select count(*), avg(rating) into v_count, v_avg
  from public.reviews
  where target_type = v_target_type and target_id = v_target_id and status = 'visible';

  if v_target_type = 'professor' then
    update public.professors set review_count = v_count, avg_rating = coalesce(v_avg, 0)
    where id = v_target_id;
  else
    update public.courses set review_count = v_count, avg_rating = coalesce(v_avg, 0)
    where id = v_target_id;
  end if;

  return null;
end;
$$;

create trigger reviews_sync_aggregates
  after insert or delete or update of status on public.reviews
  for each row
  execute function public.sync_review_aggregates();

-- "Helpful" voting — a plan-listed table (see HANDOFF.md §13) that fills
-- reviews.helpful_count, mirroring the reactions "like" pattern: one vote
-- per (review, user), insert = mark helpful, delete = unmark.
create table public.review_votes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_votes enable row level security;

create policy "review votes are readable wherever the review is readable"
  on public.review_votes for select
  to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_votes.review_id and r.university_id = public.current_university_id()
    )
  );

create policy "verified active users can mark a review helpful"
  on public.review_votes for insert
  to authenticated
  with check (
    user_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
    and exists (
      select 1 from public.reviews r
      where r.id = review_votes.review_id
        and r.status = 'visible'
        and r.university_id = public.current_university_id()
        and r.reviewer_id <> public.current_app_user_id()
    )
  );

create policy "users can remove their own helpful vote"
  on public.review_votes for delete
  to authenticated
  using (user_id = public.current_app_user_id());

create or replace function public.sync_review_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.reviews set helpful_count = helpful_count + 1 where id = new.review_id;
  elsif tg_op = 'DELETE' then
    update public.reviews set helpful_count = helpful_count - 1 where id = old.review_id;
  end if;
  return null;
end;
$$;

create trigger review_votes_sync_helpful_count
  after insert or delete on public.review_votes
  for each row
  execute function public.sync_review_helpful_count();

-- Report reasons tailored to reviews (plan §8), separate from a general
-- reporting system since that doesn't exist yet (step 14). 2+ reports
-- auto-hides pending a mod check, protecting professors from harassment
-- without full pre-moderation of every review.
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (reason in ('harassment', 'personal_info', 'spam', 'off_topic', 'fake', 'other')),
  details text check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

alter table public.review_reports enable row level security;

create policy "reporters can see their own reports"
  on public.review_reports for select
  to authenticated
  using (reporter_id = public.current_app_user_id());

create policy "staff can see reports in their university"
  on public.review_reports for select
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.reviews r
      where r.id = review_reports.review_id and r.university_id = public.current_university_id()
    )
  );

create policy "verified active users can report a review"
  on public.review_reports for insert
  to authenticated
  with check (
    reporter_id = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
    and exists (
      select 1 from public.reviews r
      where r.id = review_reports.review_id and r.university_id = public.current_university_id()
    )
  );

create or replace function public.auto_hide_reported_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_count int;
begin
  select count(*) into v_report_count from public.review_reports where review_id = new.review_id;

  if v_report_count >= 2 then
    update public.reviews set status = 'hidden' where id = new.review_id and status = 'visible';
  end if;

  return new;
end;
$$;

create trigger review_reports_auto_hide
  after insert on public.review_reports
  for each row
  execute function public.auto_hide_reported_review();
