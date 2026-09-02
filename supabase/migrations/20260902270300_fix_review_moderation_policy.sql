-- Bug found during live verification: Postgres RLS combines every
-- applicable permissive policy's WITH CHECK clauses with OR independently
-- of USING (not paired per-policy). The staff UPDATE policy's WITH CHECK
-- only asserted `university_id = current_university_id()`, with no
-- `is_staff()` check — so a non-staff reviewer's own UPDATE satisfied the
-- *author* policy's USING (reviewer_id = self) and then slipped through
-- the *staff* policy's under-restrictive WITH CHECK, letting them set their
-- own review to 'hidden' even though the author policy's own WITH CHECK
-- was written to only allow 'removed'. Confirmed live: an author-owned
-- review could be PATCHed to status=hidden and the request succeeded.
-- Fix: require is_staff() in the WITH CHECK too, not just USING.
drop policy "staff can moderate reviews in their university" on public.reviews;

create policy "staff can moderate reviews in their university"
  on public.reviews for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (public.is_staff() and university_id = public.current_university_id());
