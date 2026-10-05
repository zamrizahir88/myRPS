-- ============================================================================
--  myRPS — RESIDENTIAL COLLEGE
--
--  Adds a "Residential college" choice to the student profile, under
--  Accommodation. You see each student's answer on their detail page.
--
--  Safe to run more than once. It adds one empty column and changes nothing
--  that already exists.
--
--  The site works without it: until this is run, the new choice simply does
--  not appear. Run it, reload the site, and it does.
--
--  Supabase → SQL Editor → New query → paste → Run.
-- ============================================================================

-- =====================================================================
-- myRPS — 18_residential_college.sql   (run EIGHTEENTH)
--
-- Which residential college a student lives in. "On Campus" alone did not
-- tell the RPS where to find somebody.
--
-- Plain text, not an enumerated type: colleges are renamed and opened more
-- often than a database should need changing for. The list the student picks
-- from lives in the app (src/pages/Profile.tsx).
--
-- Like the address beside it, this is for the student and the RPS. It is not
-- in any of the views classmates read.
-- =====================================================================

alter table public.profiles
  add column if not exists residential_college text;

-- ============================================================================
--  Result — should say OK.
-- ============================================================================
select 'residential college on the profile' as item,
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'public' and table_name = 'profiles'
                            and column_name = 'residential_college')
            then 'OK' else 'FAILED' end as result;
