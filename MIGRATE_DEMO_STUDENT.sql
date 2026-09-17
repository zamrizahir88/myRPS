-- ============================================================================
--  myRPS — DEMO STUDENT ACCOUNT
--
--  Lets you test the student side for real: enter subjects, grades and
--  semesters as a student, then look at the result in your own RPS view.
--
--  RUN THIS FIRST, before creating the account. Until the address is listed
--  here, the database refuses to register it and the Supabase dashboard will
--  show an error.
--
--  Then, in Supabase:
--    Authentication → Users → Add user → Create new user
--      Email     demo.student@studentmail.unimap.edu.my
--      Password  anything you will remember
--      Auto Confirm User   ← tick this, or the account cannot sign in
--
--  Then open myRPS in a private/incognito window and sign in as that account.
--  Fill its profile (intake year 2026), and the Academic tab unlocks. Anything
--  it records shows up in your own view under My Students — tick "show test
--  accounts" to see it.
--
--  To use a different address, change it in BOTH places below.
--
--  Supabase → SQL Editor → New query → paste → Run.
-- ============================================================================

-- =====================================================================
-- myRPS — 15_demo_student.sql   (run FIFTEENTH)
--
-- "View as student" shows the student interface with the RPS's own account
-- behind it, so the academic tracker has nothing to track: a lecturer account
-- has no programme and no intake year. Testing subjects, grades and semesters
-- properly needs a real student account.
--
-- The machinery for that already exists — handle_new_user() lets any address
-- listed in demo_emails register whatever the domain rule says, approves it on
-- the spot and flags it is_demo, which keeps it off the leaderboard and out of
-- the student list unless "show test accounts" is ticked. The list was simply
-- left empty, so nothing could use it.
--
-- Add the demo address here, then create the account (see the instructions in
-- MIGRATE_DEMO_STUDENT.sql). Several addresses may be listed, comma-separated.
-- =====================================================================

insert into public.app_settings (key, value)
values ('demo_emails', 'demo.student@studentmail.unimap.edu.my')
on conflict (key) do update set value = excluded.value;

-- Order-tolerant: if the account was created before the address was listed —
-- or through the Supabase dashboard, which does not always leave the profile
-- in the same state — bring it to where a demo account should be.
update public.profiles p
   set is_demo        = true,
       approval_state = 'approved'::public.approval_state,
       approved_at    = coalesce(p.approved_at, now())
 where exists (
         select 1
         from unnest(string_to_array(
                (select value from public.app_settings where key = 'demo_emails'), ',')) as e
         where lower(btrim(e)) = lower(p.email_official)
       )
   and (not p.is_demo or p.approval_state <> 'approved');

-- ============================================================================
--  Result — the first row should say OK. The second tells you whether the
--  account exists yet; "not created yet" is expected the first time.
-- ============================================================================
select 'demo address allowed to register' as item,
       case when coalesce((select value from public.app_settings where key = 'demo_emails'), '') <> ''
            then 'OK — ' || (select value from public.app_settings where key = 'demo_emails')
            else 'FAILED' end as result
union all
select 'demo account',
       coalesce((select 'ready: ' || p.email_official || ' (' || p.approval_state || ')'
                   from public.profiles p where p.is_demo limit 1),
                'not created yet — add it under Authentication → Users');
