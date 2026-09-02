-- Extends the existing "suggest a new professor/course" queue
-- (20260902270100_entity_submissions.sql) to also cover community-creation
-- requests, reusing the exact same "no client INSERT, SECURITY DEFINER RPC
-- is the only mutation path" pattern already proven there. Looks up the
-- inline check constraint's actual (auto-generated) name rather than
-- hardcoding it, since Postgres's naming for an unnamed inline check isn't
-- guaranteed across versions.
-- payload shape for type='community': { name, description?, type: "public"|"restricted" }
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.entity_submissions'::regclass
    and pg_get_constraintdef(oid) ilike '%type = any%professor%course%';

  if v_conname is null then
    raise exception 'Could not find entity_submissions.type check constraint to replace';
  end if;

  execute format('alter table public.entity_submissions drop constraint %I', v_conname);
end $$;

alter table public.entity_submissions
  add constraint entity_submissions_type_check check (type in ('professor', 'course', 'community'));

comment on table public.entity_submissions is
  'type=professor/course payload shapes: see 20260902270100_entity_submissions.sql. type=community payload: { name, description?, type: "public"|"restricted" }. Community-request review is admin-only (enforced inside admin_review_entity_submission); professor/course review stays staff-wide.';

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

  -- Founder requirement: community-request review is admin-only, unlike
  -- professor/course suggestions, which stay staff-wide.
  if v_sub.type = 'community' and public.current_app_role() <> 'admin' then
    raise exception 'Only an admin can review a community request';
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
  elsif v_sub.type = 'community' then
    -- communities_after_insert_auto_join_owner (20260902230100_communities.sql)
    -- fires automatically here, making the requester the owner-member.
    insert into public.communities (id, university_id, created_by, name, description, type, slug)
    values (
      v_new_id,
      v_sub.university_id,
      v_sub.submitted_by,
      v_sub.payload ->> 'name',
      nullif(v_sub.payload ->> 'description', ''),
      coalesce(v_sub.payload ->> 'type', 'public'),
      public.slugify(v_sub.payload ->> 'name') || '-' || substr(v_new_id::text, 1, 6)
    );
  end if;

  update public.entity_submissions
  set status = 'approved', reviewed_by = public.current_app_user_id(), reviewed_at = now()
  where id = p_submission_id;

  return v_new_id;
end;
$$;

-- Community creation now requires approval — same "no client INSERT,
-- SECURITY DEFINER RPC is the only mutation path" pattern already used for
-- professors/courses. Requests go through entity_submissions
-- (type='community') instead of a direct client INSERT.
drop policy "verified active users can create communities" on public.communities;
