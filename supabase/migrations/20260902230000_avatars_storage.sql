-- Public bucket (unlike post-media): avatars are low-sensitivity — a
-- deliberate trade-off to avoid resolving a signed URL every time any
-- avatar renders anywhere in the app (feed, comments, search results...).
-- Objects live at {university_id}/{user_id}/avatar.{ext}, one per user
-- (upsert overwrites), so users.avatar_url can just store the public URL
-- directly rather than a path needing later resolution.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.is_active_user()
    and public.is_verified_user()
    and (storage.foldername(name))[1] = public.current_university_id()::text
    and (storage.foldername(name))[2] = public.current_app_user_id()::text
  );

create policy "users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[2] = public.current_app_user_id()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[2] = public.current_app_user_id()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[2] = public.current_app_user_id()::text);
