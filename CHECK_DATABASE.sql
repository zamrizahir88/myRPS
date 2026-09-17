-- ============================================================================
--  myRPS — DATABASE HEALTH CHECK
--
--  Reads only. Changes nothing. Safe to run as many times as you like.
--  It tells you whether every migration you pasted actually landed.
--
--  Supabase → SQL Editor → New query → paste → Run.
--  Every row should say OK. Anything that says MISSING names the file to
--  re-run — re-running a migration is safe, they are all written to be
--  repeatable.
-- ============================================================================

with checks(step, item, ok) as (
  values
    -- ---- RUN_THIS_IN_SUPABASE.sql (the first, big one) ---------------------
    ('1. RUN_THIS_IN_SUPABASE', 'student profiles table',
       to_regclass('public.profiles') is not null),
    ('1. RUN_THIS_IN_SUPABASE', 'curriculum subjects seeded',
       coalesce((select count(*) from public.curriculum_subjects), 0) >= 100),
    ('1. RUN_THIS_IN_SUPABASE', 'psychometric test: 70 questions',
       coalesce((select count(*) from public.psychometric_items), 0) = 70),
    ('1. RUN_THIS_IN_SUPABASE', 'avatar storage bucket',
       exists (select 1 from storage.buckets where id = 'avatars')),

    -- ---- MIGRATE_TERMS.sql --------------------------------------------------
    ('2. MIGRATE_TERMS', 'semester / session table',
       to_regclass('public.student_terms') is not null),
    ('2. MIGRATE_TERMS', 'results linked to a semester',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'student_records'
                  and column_name = 'term_id')),
    ('2. MIGRATE_TERMS', 'repeat attempts allowed',
       to_regprocedure('public.term_key(text,integer)') is not null),

    -- ---- MIGRATE_FIXES.sql --------------------------------------------------
    ('3. MIGRATE_FIXES', '2026 curriculum available',
       exists (select 1 from public.curriculum_subjects where intake_year = '2026')),
    ('3. MIGRATE_FIXES', '2026 graduation totals',
       exists (select 1 from public.curriculum_requirements where intake_year = '2026')),

    -- ---- MIGRATE_FEED.sql ---------------------------------------------------
    ('4. MIGRATE_FEED', 'posts', to_regclass('public.posts') is not null),
    ('4. MIGRATE_FEED', 'comments', to_regclass('public.post_comments') is not null),
    ('4. MIGRATE_FEED', 'reactions', to_regclass('public.post_reactions') is not null),
    ('4. MIGRATE_FEED', 'like / comment counts', to_regclass('public.v_post_stats') is not null),

    -- ---- MIGRATE_AVATARS.sql ------------------------------------------------
    ('5. MIGRATE_AVATARS', 'photos shown beside names',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'member_names'
                  and column_name = 'avatar_path')),
    ('5. MIGRATE_AVATARS', 'classmates may load each others photos',
       exists (select 1 from pg_policies
                where schemaname = 'storage' and tablename = 'objects'
                  and policyname ilike '%avatar%')),

    -- ---- MIGRATE_PROFILES.sql -----------------------------------------------
    ('6. MIGRATE_PROFILES', 'your RPS card', to_regclass('public.rps_card') is not null),
    ('6. MIGRATE_PROFILES', 'student profile pages',
       to_regclass('public.public_profiles') is not null),
    ('6. MIGRATE_PROFILES', 'staff fields on your profile',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'profiles'
                  and column_name = 'cv_url')),

    -- ---- MIGRATE_VISIBLE_PROFILES.sql ---------------------------------------
    ('7. MIGRATE_VISIBLE_PROFILES', 'new accounts visible by default',
       (select column_default from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name = 'share_profile') = 'true'),
    ('7. MIGRATE_VISIBLE_PROFILES', 'existing students switched on',
       not exists (select 1 from public.profiles p
                    where not p.share_profile
                      and not exists (select 1 from public.admins a where a.user_id = p.id))),

    -- ---- MIGRATE_DEMO_STUDENT.sql -------------------------------------------
    ('8. MIGRATE_DEMO_STUDENT', 'a demo address may register',
       coalesce((select value from public.app_settings where key = 'demo_emails'), '') <> ''),

    -- ---- MIGRATE_EXEMPTIONS.sql ---------------------------------------------
    ('9. MIGRATE_EXEMPTIONS', 'exemptions sit outside the semesters',
       not exists (select 1 from public.student_records
                    where state = 'exempted' and term_id is not null)),
    ('9. MIGRATE_EXEMPTIONS', 'one exemption per subject',
       to_regclass('public.student_records_one_exemption') is not null),
    ('9. MIGRATE_EXEMPTIONS', 'credits split into taken and exempted',
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'student_summary'
           and column_name in ('credits_taken','credits_exempted','current_semester_credits')) = 3)
)
select step, item, case when ok then 'OK' else 'MISSING — re-run this file' end as result
from checks
order by step, item;
