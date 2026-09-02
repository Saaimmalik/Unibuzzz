-- "Suggest a new professor/course" queue (plan §8) — the only user-facing
-- path that can ever result in a new row in professors/courses, since both
-- tables are closed to direct client writes (see previous migration).
-- payload shape (validated client-side by packages/shared/src/schemas/review.ts):
--   type='professor': { first_name, last_name, department, course_codes?: string[] }
--   type='course':    { code, title, department }
create table public.entity_submissions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  submitted_by uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('professor', 'course')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'duplicate')),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index entity_submissions_university_id_status_idx
  on public.entity_submissions (university_id, status, created_at desc);

alter table public.entity_submissions enable row level security;

create policy "submitters can see their own submissions"
  on public.entity_submissions for select
  to authenticated
  using (submitted_by = public.current_app_user_id());

create policy "staff can see all submissions in their university"
  on public.entity_submissions for select
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id());

create policy "verified active users can suggest a new entry"
  on public.entity_submissions for insert
  to authenticated
  with check (
    university_id = public.current_university_id()
    and submitted_by = public.current_app_user_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

-- No client UPDATE policy: submissions are only ever transitioned by the
-- admin_review_entity_submission RPC below (SECURITY DEFINER, checks
-- is_staff() itself), never by a direct PATCH.

-- Approves (creates the real professor/course row), rejects, or marks a
-- submission as a duplicate of an existing entity. Returns the new/matched
-- entity id (null on reject). SECURITY DEFINER so it can write to the
-- otherwise closed professors/courses/professor_courses tables.
create or replace function public.admin_review_entity_submission(
  p_submission_id uuid,
  p_decision text,
  p_merge_into_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.entity_submissions%rowtype;
  v_new_id uuid;
  v_code text;
begin
  if not public.is_staff() then
    raise exception 'Only staff can review submissions';
  end if;
  if p_decision not in ('approve', 'reject', 'duplicate') then
    raise exception 'Invalid decision';
  end if;

  select * into v_sub from public.entity_submissions where id = p_submission_id;
  if v_sub.id is null or v_sub.university_id <> public.current_university_id() then
    raise exception 'Submission not found';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'Submission already reviewed';
  end if;

  if p_decision = 'reject' then
    update public.entity_submissions
    set status = 'rejected', reviewed_by = public.current_app_user_id(), reviewed_at = now()
    where id = p_submission_id;
    return null;
  end if;

  if p_decision = 'duplicate' then
    if p_merge_into_id is null then
      raise exception 'duplicate decision requires p_merge_into_id';
    end if;
    update public.entity_submissions
    set status = 'duplicate', reviewed_by = public.current_app_user_id(), reviewed_at = now()
    where id = p_submission_id;
    return p_merge_into_id;
  end if;

  -- p_decision = 'approve'
  v_new_id := gen_random_uuid();

  if v_sub.type = 'professor' then
    insert into public.professors (id, university_id, first_name, last_name, department, slug)
    values (
      v_new_id,
      v_sub.university_id,
      v_sub.payload ->> 'first_name',
      v_sub.payload ->> 'last_name',
      v_sub.payload ->> 'department',
      public.slugify((v_sub.payload ->> 'first_name') || ' ' || (v_sub.payload ->> 'last_name'))
        || '-' || substr(v_new_id::text, 1, 6)
    );

    -- Optional: link the new professor to existing courses by code, when
    -- the submitter listed which modules they teach.
    if jsonb_typeof(v_sub.payload -> 'course_codes') = 'array' then
      for v_code in select jsonb_array_elements_text(v_sub.payload -> 'course_codes')
      loop
        insert into public.professor_courses (professor_id, course_id)
        select v_new_id, c.id from public.courses c
        where c.university_id = v_sub.university_id and c.code = v_code
        on conflict do nothing;
      end loop;
    end if;
  elsif v_sub.type = 'course' then
    insert into public.courses (id, university_id, code, title, department, slug)
    values (
      v_new_id,
      v_sub.university_id,
      v_sub.payload ->> 'code',
      v_sub.payload ->> 'title',
      v_sub.payload ->> 'department',
      public.slugify(v_sub.payload ->> 'code')
    );
  end if;

  update public.entity_submissions
  set status = 'approved', reviewed_by = public.current_app_user_id(), reviewed_at = now()
  where id = p_submission_id;

  return v_new_id;
end;
$$;
