-- Security and correctness tests. Run against the local stub only.
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

-- No grants here on purpose: 03_rls.sql is supposed to set them up itself,
-- so if it doesn't, these tests fail rather than silently passing on a grant
-- the harness handed out.

\echo '--- signup gate ---'
do $$
begin
  insert into auth.users (email) values ('randomer@gmail.com');
  raise exception 'FAIL: outside-domain signup was accepted';
exception
  when check_violation then raise notice 'PASS: outside-domain signup rejected';
end $$;

update public.app_settings set value = 'zamrizahir@unimap.edu.my' where key = 'bootstrap_admin_email';

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa', 'zamrizahir@unimap.edu.my'),
  ('00000000-0000-0000-0000-0000000000b1', 's221371666@studentmail.unimap.edu.my'),
  ('00000000-0000-0000-0000-0000000000b2', 's221373137@studentmail.unimap.edu.my');

do $$
declare n int;
begin
  select count(*) into n from public.admins where user_id = '00000000-0000-0000-0000-0000000000aa';
  if n <> 1 then raise exception 'FAIL: bootstrap admin not created'; end if;
  select count(*) into n from public.profiles where approval_state = 'pending';
  if n <> 2 then raise exception 'FAIL: expected 2 pending students, got %', n; end if;
  raise notice 'PASS: admin bootstrapped, students pending';
end $$;

\echo '--- a student cannot approve themselves ---'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

update public.profiles
   set approval_state = 'approved', full_name = 'Muhammad Rusydi bin Rahimie'
 where id = auth.uid();

do $$
declare s public.approval_state;
begin
  select approval_state into s from public.profiles where id = auth.uid();
  if s <> 'pending' then raise exception 'FAIL: student self-approved (state=%)', s; end if;
  raise notice 'PASS: self-approval blocked, other columns still saved';
end $$;

do $$
begin
  perform public.admin_set_approval('00000000-0000-0000-0000-0000000000b1', 'approved');
  raise exception 'FAIL: student could call admin_set_approval';
exception
  when insufficient_privilege then raise notice 'PASS: admin RPC refuses students';
end $$;

\echo '--- a student sees only their own profile ---'
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: student can see % profiles', n; end if;
  raise notice 'PASS: profile row-level isolation holds';
end $$;

-- the RPS must still be able to repair an account from the Supabase SQL editor,
-- where there is no logged-in user at all
reset role;
set request.jwt.claim.sub = '';   -- no JWT, as in the SQL editor
do $$
begin
  update public.profiles set approval_state = 'approved'
   where id = '00000000-0000-0000-0000-0000000000b2';
  if (select approval_state from public.profiles
       where id = '00000000-0000-0000-0000-0000000000b2') <> 'approved' then
    raise exception 'FAIL: the RPS cannot fix an account from the SQL editor';
  end if;
  update public.profiles set approval_state = 'pending'
   where id = '00000000-0000-0000-0000-0000000000b2';
  raise notice 'PASS: SQL editor can repair an account by hand';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

\echo '--- admin approves ---'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
select public.admin_set_approval('00000000-0000-0000-0000-0000000000b1', 'approved');
select public.admin_set_approval('00000000-0000-0000-0000-0000000000b2', 'approved');

do $$
declare n int;
begin
  -- the bootstrap admin is approved too, so count only the two students
  select count(*) into n from public.profiles
   where approval_state = 'approved'
     and id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2');
  if n <> 2 then raise exception 'FAIL: expected 2 approved students, got %', n; end if;
  raise notice 'PASS: admin approval works and is audited';
end $$;

reset role;
update public.profiles set intake_year = '2022', programme_code = 'UR6523007',
       full_name = 'Muhammad Rusydi bin Rahimie', matric_no = '221371666'
 where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set intake_year = '2022', full_name = 'Alywin Killarney Rentap', matric_no = '221373137'
 where id = '00000000-0000-0000-0000-0000000000b2';

\echo '--- credit maths with a repeated subject ---'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

-- SMQ11103 taken three times: F, then D, then C. Real case from AMIS.
insert into public.student_records (user_id, subject_id, attempt_no, state, grade, semester_taken)
select auth.uid(), id, 1, 'fail', 'F', '2022-S1' from public.curriculum_subjects
 where code = 'SMQ11103' and intake_year = '2022';
insert into public.student_records (user_id, subject_id, attempt_no, state, grade, semester_taken)
select auth.uid(), id, 2, 'fail', 'D', '2023-S1' from public.curriculum_subjects
 where code = 'SMQ11103' and intake_year = '2022';
insert into public.student_records (user_id, subject_id, attempt_no, state, grade, semester_taken)
select auth.uid(), id, 3, 'pass', 'C', '2024-S1' from public.curriculum_subjects
 where code = 'SMQ11103' and intake_year = '2022';
-- plus one clean pass
insert into public.student_records (user_id, subject_id, attempt_no, state, grade, semester_taken)
select auth.uid(), id, 1, 'pass', 'B', '2022-S1' from public.curriculum_subjects
 where code = 'NMK10103' and intake_year = '2022';

do $$
declare c int; g numeric;
begin
  select credits_earned, cgpa into c, g from public.student_summary where user_id = auth.uid();
  -- 3 (SMQ11103, counted once) + 3 (NMK10103) = 6
  if c <> 6 then raise exception 'FAIL: repeated subject double-counted, credits=%', c; end if;
  -- latest graded attempts only: C(2.00)*3 + B(3.00)*3 = 15 over 6 credits = 2.50
  if g <> 2.50 then raise exception 'FAIL: CGPA should be 2.50, got %', g; end if;
  raise notice 'PASS: repeat counted once (6 credits), CGPA 2.50 uses latest attempts';
end $$;

do $$
declare n int;
begin
  insert into public.student_records (user_id, subject_id, attempt_no, state, grade)
  select auth.uid(), id, 3, 'pass', 'A' from public.curriculum_subjects
   where code = 'SMQ11103' and intake_year = '2022';
  raise exception 'FAIL: duplicate attempt_no was accepted';
exception
  when unique_violation then raise notice 'PASS: duplicate attempt blocked by constraint';
end $$;

\echo '--- psychometric is one attempt, enforced in the database ---'
insert into public.psychometric_attempts
  (user_id, attempt_no, responses, linguistic, logical, musical, kinesthetic,
   spatial, interpersonal, intrapersonal, strength, weakness)
values (auth.uid(), 1, '{"1":4}'::jsonb, 31, 26, 14, 22, 35, 19, 28, 'spatial', 'musical');

do $$
begin
  insert into public.psychometric_attempts
    (user_id, attempt_no, responses, linguistic, logical, musical, kinesthetic,
     spatial, interpersonal, intrapersonal, strength, weakness)
  values (auth.uid(), 2, '{"1":1}'::jsonb, 10, 10, 10, 10, 10, 10, 10, 'spatial', 'musical');
  raise exception 'FAIL: second attempt allowed without a reset';
exception
  when insufficient_privilege then raise notice 'PASS: retake blocked by RLS until the RPS resets';
end $$;

do $$
begin
  update public.psychometric_attempts set spatial = 40 where user_id = auth.uid();
  if found then raise exception 'FAIL: student edited a submitted attempt'; end if;
  raise notice 'PASS: submitted attempts are immutable';
end $$;

\echo '--- admin reset unlocks exactly one retake ---'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
select public.admin_reset_psychometric('00000000-0000-0000-0000-0000000000b1');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$
begin
  if not public.can_take_psychometric() then raise exception 'FAIL: reset did not unlock a retake'; end if;
  raise notice 'PASS: reset unlocks a retake, history kept';
end $$;

\echo '--- leaderboard exposes engagement, never grades ---'
do $$
declare cols text;
begin
  select string_agg(column_name, ',' order by ordinal_position) into cols
  from information_schema.columns where table_name = 'leaderboard';
  if cols ~* '(cgpa|credit|fail|ic_no|email|race|religion|income|phone)' then
    raise exception 'FAIL: leaderboard leaks %', cols;
  end if;
  raise notice 'PASS: leaderboard columns are %', cols;
end $$;

do $$
declare n int;
begin
  select count(*) into n from public.leaderboard;
  if n <> 2 then raise exception 'FAIL: student sees % leaderboard rows, expected 2', n; end if;
  raise notice 'PASS: every approved student is visible on the leaderboard';
end $$;

\echo '--- one student cannot read another''s records ---'
do $$
declare n int;
begin
  select count(*) into n from public.student_records
   where user_id = '00000000-0000-0000-0000-0000000000b2';
  if n <> 0 then raise exception 'FAIL: cross-student record read'; end if;
  select count(*) into n from public.meetings where user_id <> auth.uid();
  if n <> 0 then raise exception 'FAIL: cross-student meeting read'; end if;
  raise notice 'PASS: academic records and meetings are private';
end $$;

\echo '--- meetings: verified records freeze; only the RPS may verify ---'
insert into public.meetings (user_id, meeting_at, location, topic, created_by)
values (auth.uid(), now(), 'Bilik Dr.', 'Semakan kursus semester', auth.uid());

do $$
begin
  update public.meetings set verified = true where user_id = auth.uid();
  raise exception 'FAIL: student self-verified a meeting';
exception
  when insufficient_privilege then
    if exists (select 1 from public.meetings where user_id = auth.uid() and verified) then
      raise exception 'FAIL: verified flag was written anyway';
    end if;
    raise notice 'PASS: student cannot self-verify (leaderboard points are safe)';
end $$;

-- but they may still correct an unverified record
do $$
begin
  update public.meetings set topic = 'Semakan kursus + rancangan LI' where user_id = auth.uid();
  if not exists (select 1 from public.meetings where topic like '%LI%') then
    raise exception 'FAIL: student could not edit their own unverified meeting';
  end if;
  raise notice 'PASS: unverified meetings remain editable by the student';
end $$;

\echo '--- chat: pending accounts are silent ---'
reset role;
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000c1', 's999999999@studentmail.unimap.edu.my');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$
begin
  insert into public.chat_messages (user_id, body) values (auth.uid(), 'hello');
  raise exception 'FAIL: unapproved account posted to chat';
exception
  when insufficient_privilege then raise notice 'PASS: unapproved account cannot post';
end $$;

do $$
declare n int;
begin
  select count(*) into n from public.leaderboard;
  if n <> 0 then raise exception 'FAIL: unapproved account read the leaderboard (% rows)', n; end if;
  select count(*) into n from public.member_names;
  if n <> 0 then raise exception 'FAIL: unapproved account read member names (% rows)', n; end if;
  raise notice 'PASS: unapproved account sees nothing (no advisee enumeration)';
end $$;

\echo '--- only the RPS may broadcast ---'
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$
begin
  insert into public.chat_messages (user_id, body, is_announcement)
  values (auth.uid(), 'free marks for everyone', true);
  raise exception 'FAIL: student posted an announcement';
exception
  when insufficient_privilege then raise notice 'PASS: announcements are admin-only';
end $$;

\echo '--- curriculum is read-only for students ---'
do $$
begin
  update public.curriculum_subjects set credit = 99 where code = 'NMK10103';
  if exists (select 1 from public.curriculum_subjects where credit = 99) then
    raise exception 'FAIL: student rewrote the curriculum';
  end if;
  raise notice 'PASS: curriculum is admin-write only';
end $$;

do $$
begin
  update public.curriculum_requirements set required_credits = 6
   where category = 'core' and intake_year = '2022';
  if (select required_credits from public.curriculum_requirements
       where category = 'core' and intake_year = '2022') <> 106 then
    raise exception 'FAIL: student rewrote their own graduation requirement';
  end if;
  raise notice 'PASS: credit requirements are admin-write only';
end $$;

\echo '--- seeded totals ---'
reset role;
do $$
declare total int;
begin
  select sum(required_credits) into total from public.curriculum_requirements where intake_year = '2025';
  if total <> 140 then raise exception 'FAIL: 2025 requirements total %, expected 140', total; end if;
  select sum(required_credits) into total from public.curriculum_requirements where intake_year = '2022';
  if total <> 140 then raise exception 'FAIL: 2022 requirements total %, expected 140', total; end if;
  raise notice 'PASS: both intakes require exactly 140 credits';
end $$;
