-- Lets a course reviewer name a professor who isn't in that course's
-- professor_courses list ("who actually taught you, if not one of the
-- names above") instead of only picking from the existing coordinators or
-- saying "not sure". Free text, not a professors.id FK — the whole point is
-- capturing a name the system doesn't have a row for yet. Surfaced to staff
-- via review_alternate_teacher_mentions() below so they can decide whether
-- professor_courses needs updating when several reviews independently name
-- the same person for the same module.

alter table public.reviews
  add column alternate_professor_name text
    check (char_length(btrim(alternate_professor_name)) between 1 and 160);

comment on column public.reviews.alternate_professor_name is
  'Course reviews only, mutually exclusive with taught_by_professor_id (enforced in validate_review_subratings) — a free-text name when the reviewer''s actual teacher isn''t one of the course''s linked professors.';

-- Extends the course-review-only gate from 20260902270500 to also cover
-- alternate_professor_name, and adds the new mutual-exclusion rule.
create or replace function public.validate_review_subratings()
returns trigger
language plpgsql
as $$
begin
  if new.target_type = 'professor' and (
    new.interest_rating is not null
    or new.difficulty_rating is not null
    or new.workload_rating is not null
    or new.teaching_rating is not null
    or new.taught_by_professor_id is not null
    or new.alternate_professor_name is not null
  ) then
    raise exception 'Sub-ratings and taught-by fields only apply to course reviews';
  end if;

  if new.taught_by_professor_id is not null and new.alternate_professor_name is not null then
    raise exception 'Pick an existing professor or name someone else, not both';
  end if;

  if new.taught_by_professor_id is not null and not exists (
    select 1 from public.professor_courses
    where course_id = new.target_id and professor_id = new.taught_by_professor_id
  ) then
    raise exception 'That professor is not linked to this course';
  end if;

  return new;
end;
$$;

-- Re-declared wholesale (as in 20260902270500) to add alternate_professor_name
-- to the immutable-content list.
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
    or new.reviewer_id is distinct from old.reviewer_id
    or new.interest_rating is distinct from old.interest_rating
    or new.difficulty_rating is distinct from old.difficulty_rating
    or new.workload_rating is distinct from old.workload_rating
    or new.teaching_rating is distinct from old.teaching_rating
    or new.taught_by_professor_id is distinct from old.taught_by_professor_id
    or new.alternate_professor_name is distinct from old.alternate_professor_name then
    raise exception 'reviews cannot be edited after creation, only removed (status) or moderated';
  end if;

  return new;
end;
$$;

-- Grouped by course + normalized (trimmed/lowercased) name so "Jane Smith"
-- and "jane smith " count as the same mention; the displayed name is
-- whichever spelling/casing was most recently submitted. Not SECURITY
-- DEFINER — relies on the existing reviews SELECT policy for both
-- university scoping and staff-only visibility of pending reviews, same as
-- course_teaching_ratings() below it. A non-staff caller would only ever
-- see aggregates of their own reviews back, which is harmless.
create or replace function public.review_alternate_teacher_mentions()
returns table (
  course_id uuid,
  course_code text,
  course_title text,
  course_slug text,
  mentioned_name text,
  mention_count int,
  latest_mentioned_at timestamptz
)
language sql
stable
as $$
  select
    r.target_id,
    c.code,
    c.title,
    c.slug,
    (array_agg(btrim(r.alternate_professor_name) order by r.created_at desc))[1],
    count(*)::int,
    max(r.created_at)
  from public.reviews r
  join public.courses c on c.id = r.target_id
  where r.target_type = 'course'
    and r.alternate_professor_name is not null
    and r.status in ('visible', 'pending')
  group by r.target_id, c.code, c.title, c.slug, lower(btrim(r.alternate_professor_name))
  order by count(*) desc, max(r.created_at) desc
$$;
