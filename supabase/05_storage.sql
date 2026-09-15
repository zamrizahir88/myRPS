-- =====================================================================
-- myRPS — 05_storage.sql   (run FIFTH)
-- Profile photos. The bucket is PRIVATE on purpose: a public bucket means
-- every student's passport photo is fetchable by URL forever, by anyone.
-- The app reads them with short-lived signed URLs instead.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- 524288 bytes = 512 KB. The app also downscales to 512px before upload, so
-- 40 students cost well under 20 MB of the free tier's 1 GB.

-- Objects are stored at  <user-uuid>/avatar.jpg  — the first path segment is
-- the owner, which is what these policies check.
drop policy if exists "avatar read own" on storage.objects;
create policy "avatar read own" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "avatar insert own" on storage.objects;
create policy "avatar insert own" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar update own" on storage.objects;
create policy "avatar update own" on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar delete own" on storage.objects;
create policy "avatar delete own" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
