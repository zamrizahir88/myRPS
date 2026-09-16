-- =====================================================================
-- myRPS — 12_avatars.sql   (run TWELFTH)
--
-- Profile photos were readable only by their owner and the RPS, so every
-- avatar in the feed, the leaderboard and the header fell back to initials.
--
-- Approved students may now read each other's photos. The bucket STAYS
-- private: nothing is served by a plain URL, the app has to mint a short-lived
-- signed link, and only a signed-in, approved account can do that. A public
-- bucket would have been simpler and would have put every student's passport
-- photo on the open internet permanently.
-- =====================================================================

drop policy if exists "avatar read own" on storage.objects;
drop policy if exists "avatar read approved" on storage.objects;
create policy "avatar read approved" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text   -- always your own
      or public.is_approved()                            -- classmates
      or public.is_admin()
    )
  );

-- Writing is unchanged: only into your own folder.

-- member_names can now carry the path, so the feed can show faces.
-- Still name + photo only; see 04_views.sql on why the column list matters.
create or replace view public.member_names
with (security_invoker = off) as
select p.id as user_id, p.full_name, p.avatar_path
from public.profiles p
where p.approval_state = 'approved'
  and (public.is_approved() or public.is_admin());

revoke all on public.member_names from anon;
grant select on public.member_names to authenticated;
