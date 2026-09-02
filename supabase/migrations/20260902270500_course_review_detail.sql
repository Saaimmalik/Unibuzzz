-- Extends Reviews to support a Rate-My-Module-style course detail page:
-- structured sub-ratings (interest/difficulty/workload/teaching) alongside
-- the existing overall `rating`, an optional "which professor taught you"
-- tag so a module's coordinators can each get a teaching rating scoped to
-- *that* module (separate from their own professor-page overall rating),
-- and official-catalogue detail columns on `courses` for assessment
-- breakdown / credits / delivery / etc. Sub-ratings and taught_by_professor_id
-- are course-review-only fields (null for professor reviews) — enforced by
-- the trigger below, not a separate table, to avoid splitting `reviews` into
-- two shapes.

alter table public.reviews
  add column interest_rating smallint check (interest_rating between 1 and 5),
  add column difficulty_rating smallint check (difficulty_rating between 1 and 5),
  add column workload_rating smallint check (workload_rating between 1 and 5),
  add column teaching_rating smallint check (teaching_rating between 1 and 5),
  add column taught_by_professor_id uuid references public.professors(id) on delete set null;

comment on column public.reviews.taught_by_professor_id is
  'Course reviews only — which of the course''s module coordinators the reviewer is rating for teaching_rating. Powers the "Who Teaches It" section on the course page; deliberately does not feed the professor''s own overall rating (see compute logic in features/reviews/api.ts).';

-- Official UCD catalogue detail, for the "How You''re Assessed" / "Official
-- Details" sections. All nullable — this is data-seeding territory (like
-- professors/courses themselves), not something students fill in. Renders
-- as an empty/omitted section on the frontend until seeded.
alter table public.courses
  add column credits numeric(4, 1),
  add column student_effort_hours int,
  add column delivery text,
  add column level text,
  add column grading text,
  add column learning_outcomes text,
  add column teaching_methods text,
  -- [{ "type": "Exam (In-person)", "weight_pct": 60, "detail": "Final Exam · End of trimester · Duration: 2 hr(s)" }, ...]
  add column assessment_breakdown jsonb not null default '[]'::jsonb,
  add column avg_interest numeric(3, 2) not null default 0,
  add column avg_difficulty numeric(3, 2) not null default 0,
  add column avg_workload numeric(3, 2) not null default 0,
  add column would_recommend_pct numeric(5, 2);

alter table public.professors
  add column would_recommend_pct numeric(5, 2);

-- Sub-ratings/taught_by only make sense on a course review; keep professor
-- reviews to the plain overall `rating` + would_recommend they already had.
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
  ) then
    raise exception 'Sub-ratings and taught_by_professor_id only apply to course reviews';
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

create trigger reviews_validate_subratings
  before insert on public.reviews
  for each row
  execute function public.validate_review_subratings();

-- Extend the existing immutability trigger to cover the new columns —
-- replaced wholesale rather than ALTERed since Postgres has no "add a
-- condition to an existing function" primitive.
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
    or new.taught_by_professor_id is distinct from old.taught_by_professor_id then
    raise exception 'reviews cannot be edited after creation, only removed (status) or moderated';
  end if;

  return new;
end;
$$;

-- Recomputes avg_rating/review_count (as before) plus, for courses only,
-- avg_interest/avg_difficulty/avg_workload/would_recommend_pct; for
-- professors, would_recommend_pct alongside the existing avg_rating.
-- Recomputed from scratch on every insert/delete/status-change, same
-- reasoning as before (simple, correct, cheap at this scale).
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
  v_avg_interest numeric;
  v_avg_difficulty numeric;
  v_avg_workload numeric;
  v_recommend_pct numeric;
begin
  select
    count(*),
    avg(rating),
    avg(interest_rating),
    avg(difficulty_rating),
    avg(workload_rating),
    case when count(*) filter (where would_recommend is not null) > 0
      then 100.0 * count(*) filter (where would_recommend) / count(*) filter (where would_recommend is not null)
      else null
    end
  into v_count, v_avg, v_avg_interest, v_avg_difficulty, v_avg_workload, v_recommend_pct
  from public.reviews
  where target_type = v_target_type and target_id = v_target_id and status = 'visible';

  if v_target_type = 'professor' then
    update public.professors
    set review_count = v_count, avg_rating = coalesce(v_avg, 0), would_recommend_pct = v_recommend_pct
    where id = v_target_id;
  else
    update public.courses
    set
      review_count = v_count,
      avg_rating = coalesce(v_avg, 0),
      avg_interest = coalesce(v_avg_interest, 0),
      avg_difficulty = coalesce(v_avg_difficulty, 0),
      avg_workload = coalesce(v_avg_workload, 0),
      would_recommend_pct = v_recommend_pct
    where id = v_target_id;
  end if;

  return null;
end;
$$;

-- Per-module teaching rating: avg(teaching_rating) grouped by the professor
-- tagged on each course review, for the course's "Who Teaches It" section.
-- Deliberately a query function, not a stored/trigger-maintained column —
-- it's a (professor, course) pair, and adding a whole junction table for a
-- read this cheap and this rarely queried isn't worth it at this scale.
create or replace function public.course_teaching_ratings(p_course_id uuid)
returns table (professor_id uuid, avg_teaching numeric, rating_count int)
language sql
stable
as $$
  select taught_by_professor_id, avg(teaching_rating), count(*)::int
  from public.reviews
  where target_type = 'course'
    and target_id = p_course_id
    and status = 'visible'
    and taught_by_professor_id is not null
    and teaching_rating is not null
  group by taught_by_professor_id
$$;
