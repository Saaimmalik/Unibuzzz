-- Private bucket; access is scoped by RLS below rather than a public URL,
-- since post content is university-only, not public. Objects are stored at
-- {university_id}/{author_id}/{filename} so the policies can check tenancy
-- and ownership from the path alone (storage.objects has no custom columns).
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', false)
on conflict (id) do nothing;

create policy "post media readable within the same university"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = public.current_university_id()::text
  );

create policy "users can upload post media to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and public.is_active_user()
    and public.is_verified_user()
    and (storage.foldername(name))[1] = public.current_university_id()::text
    and (storage.foldername(name))[2] = public.current_app_user_id()::text
  );

create policy "users can delete their own post media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[2] = public.current_app_user_id()::text
  );
