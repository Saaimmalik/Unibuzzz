-- General reporting, covering everything review_reports doesn't (posts,
-- comments, listings, messages, communities, users). review_reports stays
-- separate — it has its own live auto-hide trigger and its own
-- review-specific reason enum; migrating it in is unnecessary risk for a
-- table that already works. The admin Reports queue UI unions both,
-- read-only.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (
    target_type in ('post', 'comment', 'listing', 'message', 'community', 'user')
  ),
  target_id uuid not null,
  reason text not null check (
    reason in ('spam', 'harassment', 'hate_speech', 'inappropriate_content', 'scam', 'impersonation', 'other')
  ),
  details text check (char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 500),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

create index reports_university_id_status_idx on public.reports (university_id, status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

alter table public.reports enable row level security;

create policy "reporters can see their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = public.current_app_user_id());

create policy "staff can see reports in their university"
  on public.reports for select
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id());

create policy "verified active users can file a report"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = public.current_app_user_id()
    and university_id = public.current_university_id()
    and public.is_active_user()
    and public.is_verified_user()
  );

-- No client UPDATE policy: only resolve_report() (added once audit_log
-- exists, 20260902280600_audit_log.sql) transitions status — same
-- "SECURITY DEFINER RPC is the only mutation path" pattern as
-- admin_review_entity_submission.

-- Validates the polymorphic target the same way validate_review_target()
-- does for reviews (no FK possible across 6 heterogeneous target tables):
-- confirms the target actually exists, belongs to the reporter's own
-- university, and — for messages specifically — that the reporter is a
-- participant of that conversation (so this can never become a way to
-- probe/report a message you were never a party to).
create or replace function public.validate_report_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_university_id uuid;
begin
  if new.target_type = 'post' then
    select university_id into v_university_id from public.posts where id = new.target_id;
  elsif new.target_type = 'comment' then
    select p.university_id into v_university_id
    from public.comments c join public.posts p on p.id = c.post_id
    where c.id = new.target_id;
  elsif new.target_type = 'listing' then
    select university_id into v_university_id from public.listings where id = new.target_id;
  elsif new.target_type = 'community' then
    select university_id into v_university_id from public.communities where id = new.target_id;
  elsif new.target_type = 'user' then
    select university_id into v_university_id from public.users where id = new.target_id;
  elsif new.target_type = 'message' then
    select c.university_id into v_university_id
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = new.target_id
      and exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = m.conversation_id and cp.user_id = new.reporter_id
      );
  end if;

  if v_university_id is null or v_university_id <> public.current_university_id() then
    raise exception 'Invalid report target';
  end if;

  return new;
end;
$$;

create trigger reports_validate_target
  before insert on public.reports
  for each row
  execute function public.validate_report_target();

-- Narrow, report-scoped staff read access to messages — intentionally NOT
-- general inbox-browsing access (that would be a privacy regression; see
-- messaging RLS in 20260902250000_messaging.sql, which grants read only to
-- conversation participants, with no staff carve-out at all). This SELECT
-- policy is additive/OR'd with the existing participant policy — unlike an
-- UPDATE's WITH CHECK, OR'd SELECT USING clauses are the intended, safe
-- semantics: staff can read a message if they're a participant (existing
-- policy) OR if it's been reported (this one).
create policy "staff can read reported messages"
  on public.messages for select
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.reports r
      where r.target_type = 'message'
        and r.target_id = messages.id
        and r.university_id = public.current_university_id()
    )
  );

-- Same report-scoped carve-out on conversations/participants, so the admin
-- UI can show "who this reported message was between" without granting
-- staff any broader visibility into the rest of that conversation's
-- messages (the messages policy above only exposes the reported message
-- itself, not its neighbors).
create policy "staff can read conversations containing a reported message"
  on public.conversations for select
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.reports r
      join public.messages m on m.id = r.target_id and r.target_type = 'message'
      where m.conversation_id = conversations.id
        and r.university_id = public.current_university_id()
    )
  );

create policy "staff can read participants of a reported conversation"
  on public.conversation_participants for select
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.reports r
      join public.messages m on m.id = r.target_id and r.target_type = 'message'
      where m.conversation_id = conversation_participants.conversation_id
        and r.university_id = public.current_university_id()
    )
  );
