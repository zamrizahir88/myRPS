-- =====================================================================
-- myRPS — 14_profiles_default_visible.sql   (run FOURTEENTH)
--
-- Student profiles are visible to classmates by default, with a switch to
-- turn each part off. Opt-in was the cautious choice, but a profile nobody
-- turns on is a profile nobody has, and this is meant to be a place where a
-- cohort recognises each other.
--
-- What becomes visible: photo, name, current semester, short bio, psychometric
-- persona NAME (never the scores), and the pillar count — which the
-- leaderboard already showed everyone anyway.
--
-- What is still never visible to a classmate: grades, CGPA, credits, fails,
-- IC number, date of birth, address, phone, family, race, religion, income,
-- meeting records and psychometric scores.
-- =====================================================================

alter table public.profiles alter column share_profile set default true;
alter table public.profiles alter column share_persona set default true;
alter table public.profiles alter column share_pillars set default true;

-- Existing accounts were created under the old default; bring them across so
-- the cohort is not invisible to itself on day one.
update public.profiles
   set share_profile = true, share_persona = true, share_pillars = true
 where share_profile = false and share_persona = false and share_pillars = false;

comment on column public.profiles.share_profile is
  'Visible to classmates by default. The student can turn it off at any time.';

-- ---------- the RPS has a profile too ----------------------------------------
-- public_profiles excludes admins, so tapping the RPS's own name in the feed
-- led to "this profile is private". Their card is the staff one; the app now
-- looks there first, and this view stays students-only.
