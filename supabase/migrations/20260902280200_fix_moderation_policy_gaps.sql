-- Same bug as 20260902270300_fix_review_moderation_policy.sql, unfixed on
-- posts/comments/listings: Postgres ORs every applicable UPDATE policy's
-- WITH CHECK clause independently of which policy's USING matched, so the
-- staff policy's under-restrictive WITH CHECK could theoretically let a
-- non-staff author's/seller's own UPDATE slip through it instead of the
-- tighter author/seller-only policy. Not currently exploitable on any of
-- these three tables (the author/seller's own policy already permits
-- everything reachable this way, and content-immutability triggers block
-- column spoofing regardless of which RLS policy matched), but fixed for
-- consistency and because the admin dashboard is about to start actively
-- relying on these staff policies.

drop policy "staff can moderate posts in their university" on public.posts;
create policy "staff can moderate posts in their university"
  on public.posts for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (public.is_staff() and university_id = public.current_university_id());

drop policy "staff can moderate comments in their university" on public.comments;
create policy "staff can moderate comments in their university"
  on public.comments for update
  to authenticated
  using (
    public.is_staff()
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.university_id = public.current_university_id()
    )
  )
  with check (
    public.is_staff()
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id and p.university_id = public.current_university_id()
    )
  );

drop policy "staff can moderate listings in their university" on public.listings;
create policy "staff can moderate listings in their university"
  on public.listings for update
  to authenticated
  using (public.is_staff() and university_id = public.current_university_id())
  with check (public.is_staff() and university_id = public.current_university_id());
