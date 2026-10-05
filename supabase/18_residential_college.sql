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
