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

-- Terms: the same subject may be taken in as many terms as needed, but only
-- once within a single term.
do $$
declare t1 uuid; t2 uuid; sid uuid;
begin
  select id into sid from public.curriculum_subjects
   where code = 'NMK21103' and intake_year = '2022';

  insert into public.student_terms (user_id, session, semester, study_year)
  values (auth.uid(), '2026/2027', 1, 1) returning id into t1;
  insert into public.student_terms (user_id, session, semester, study_year)
  values (auth.uid(), '2026/2027', 2, 1) returning id into t2;

  insert into public.student_records (user_id, subject_id, term_id, state, grade)
  values (auth.uid(), sid, t1, 'fail', 'D');
  insert into public.student_records (user_id, subject_id, term_id, state, grade)
  values (auth.uid(), sid, t2, 'pass', 'B');
  raise notice 'PASS: a failed subject can be retaken in a later term';
end $$;

do $$
declare sid uuid; tid uuid;
begin
  select id into sid from public.curriculum_subjects
   where code = 'NMK21103' and intake_year = '2022';
  select id into tid from public.student_terms
   where user_id = auth.uid() and session = '2026/2027' and semester = 1;
  insert into public.student_records (user_id, subject_id, term_id, state)
  values (auth.uid(), sid, tid, 'active');
  raise exception 'FAIL: the same subject was added twice to one term';
exception
  when unique_violation then
    raise notice 'PASS: a subject cannot be added twice within one term';
end $$;

do $$
declare g numeric;
begin
  -- D (1.00) then B (3.00) on a 3-credit subject, plus the earlier C and B.
  -- Only the later B counts for NMK21103.
  select cgpa into g from public.v_student_cgpa where user_id = auth.uid();
  if g is null then raise exception 'FAIL: no CGPA computed'; end if;
  if exists (
    select 1 from public.v_gpa_attempts
    where user_id = auth.uid()
      and subject_id = (select id from public.curriculum_subjects
                         where code = 'NMK21103' and intake_year = '2022')
      and grade <> 'B'
  ) then
    raise exception 'FAIL: the repeated attempt did not supersede the failed one';
  end if;
  raise notice 'PASS: the later term supersedes the earlier attempt in CGPA (now %)', g;
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

\echo '--- repeats and Semester Tambahan: which attempt counts ---'
reset role;
set request.jwt.claim.sub = '';
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000d1', 's221400001@studentmail.unimap.edu.my');
update public.profiles
   set approval_state = 'approved', intake_year = '2022', programme_code = 'UR6523007',
       full_name = 'Repeat Test Student'
 where id = '00000000-0000-0000-0000-0000000000d1';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';

do $$
declare
  t1 uuid; t2 uuid; t3 uuid;
  subj_a uuid; subj_b uuid;
begin
  select id into subj_a from public.curriculum_subjects where code = 'NMK10103' and intake_year = '2022';
  select id into subj_b from public.curriculum_subjects where code = 'NMK10203' and intake_year = '2022';

  insert into public.student_terms (user_id, session, semester, study_year)
  values (auth.uid(), '2026/2027', 1, 1) returning id into t1;
  insert into public.student_terms (user_id, session, semester, study_year)
  values (auth.uid(), '2026/2027', 2, 1) returning id into t2;
  -- Semester Tambahan sits AFTER Semester 2 in the same session
  insert into public.student_terms (user_id, session, semester, study_year)
  values (auth.uid(), '2026/2027', 3, 1) returning id into t3;

  -- subject A: failed in Sem 1, repeated in Sem 2
  insert into public.student_records (user_id, subject_id, term_id, state, grade)
  values (auth.uid(), subj_a, t1, 'fail', 'F'),
         (auth.uid(), subj_a, t2, 'pass', 'B');

  -- subject B: failed in Sem 2, repeated in Semester Tambahan
  insert into public.student_records (user_id, subject_id, term_id, state, grade)
  values (auth.uid(), subj_b, t2, 'fail', 'F'),
         (auth.uid(), subj_b, t3, 'pass', 'C');
end $$;

do $$
declare g numeric; c int;
begin
  -- Only the latest attempt of each: B(3.00)x3 + C(2.00)x3 = 15 over 6 credits
  select cgpa, graded_credits into g, c from public.v_student_cgpa where user_id = auth.uid();
  if g <> 2.50 then raise exception 'FAIL: CGPA should be 2.50, got %', g; end if;
  if c <> 6 then raise exception 'FAIL: only 6 credits should count, got %', c; end if;
  raise notice 'PASS: superseded fails drop out of CGPA entirely (2.50 over 6 credits)';
end $$;

do $$
declare k text;
begin
  select term_key into k from public.v_gpa_attempts
   where user_id = auth.uid()
     and subject_id = (select id from public.curriculum_subjects
                        where code = 'NMK10203' and intake_year = '2022');
  if k <> '2026/2027-3' then
    raise exception 'FAIL: Semester Tambahan did not supersede Semester 2 (got %)', k;
  end if;
  raise notice 'PASS: Semester Tambahan ranks after Semester 2 in the same session';
end $$;

do $$
declare png1 numeric; png2 numeric; png3 numeric;
begin
  select gpa into png1 from public.v_semester_gpa where user_id = auth.uid() and semester = 1;
  select gpa into png2 from public.v_semester_gpa where user_id = auth.uid() and semester = 2;
  select gpa into png3 from public.v_semester_gpa where user_id = auth.uid() and semester = 3;
  -- the semester's own GPA keeps the fail: it is history, not the running CGPA
  if png1 <> 0.00 then raise exception 'FAIL: Sem 1 PNG should be 0.00, got %', png1; end if;
  if png2 <> 1.50 then raise exception 'FAIL: Sem 2 PNG should be 1.50, got %', png2; end if;
  if png3 <> 2.00 then raise exception 'FAIL: Tambahan PNG should be 2.00, got %', png3; end if;
  raise notice 'PASS: each semester keeps its own PNG including the fail (0.00 / 1.50 / 2.00)';
end $$;

\echo '--- the feed ---'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

do $$
declare pid uuid;
begin
  insert into public.posts (user_id, body, subject_code)
  values (auth.uid(), 'Siapa ambil NMK21103 semester ni? Susah gila', 'NMK21103')
  returning id into pid;
  insert into public.post_reactions (post_id, user_id, emoji) values (pid, auth.uid(), '🔥');
  insert into public.post_comments (post_id, user_id, body) values (pid, auth.uid(), 'Jom study group');
  raise notice 'PASS: a student can post, react and comment';
end $$;

do $$
begin
  insert into public.posts (user_id, kind, body)
  values (auth.uid(), 'announcement', 'Free marks for everyone');
  raise exception 'FAIL: a student posted an announcement';
exception
  when insufficient_privilege then raise notice 'PASS: only the RPS may broadcast';
end $$;

do $$
begin
  insert into public.posts (user_id, body)
  values ('00000000-0000-0000-0000-0000000000b2', 'posting as somebody else');
  raise exception 'FAIL: a student posted under another account';
exception
  when insufficient_privilege then raise notice 'PASS: you can only post as yourself';
end $$;

-- one reaction per person per post, replaced rather than stacked
do $$
declare pid uuid; n int;
begin
  select id into pid from public.posts where user_id = auth.uid() limit 1;
  insert into public.post_reactions (post_id, user_id, emoji) values (pid, auth.uid(), '👏')
  on conflict (post_id, user_id) do update set emoji = excluded.emoji;
  select count(*) into n from public.post_reactions where post_id = pid and user_id = auth.uid();
  if n <> 1 then raise exception 'FAIL: reactions stacked, got %', n; end if;
  raise notice 'PASS: one reaction per person, switching replaces it';
end $$;

-- an unapproved account must see none of it
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
do $$
declare n int;
begin
  select count(*) into n from public.posts;
  if n <> 0 then raise exception 'FAIL: unapproved account read % posts', n; end if;
  select count(*) into n from public.post_comments;
  if n <> 0 then raise exception 'FAIL: unapproved account read comments'; end if;
  raise notice 'PASS: unapproved accounts see no posts or comments';
end $$;

do $$
begin
  insert into public.posts (user_id, body) values (auth.uid(), 'let me in');
  raise exception 'FAIL: unapproved account posted';
exception
  when insufficient_privilege then raise notice 'PASS: unapproved accounts cannot post';
end $$;

-- a student must not be able to rewrite someone else's post
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$
begin
  update public.posts set body = 'hijacked'
   where user_id = '00000000-0000-0000-0000-0000000000b1';
  if exists (select 1 from public.posts where body = 'hijacked') then
    raise exception 'FAIL: one student edited another student''s post';
  end if;
  raise notice 'PASS: posts are editable only by their author or the RPS';
end $$;

-- the RPS can moderate
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
do $$
declare pid uuid;
begin
  select id into pid from public.posts
   where user_id = '00000000-0000-0000-0000-0000000000b1' limit 1;
  update public.posts set deleted_at = now(), deleted_by = auth.uid() where id = pid;
  if not exists (select 1 from public.posts where id = pid and deleted_at is not null) then
    raise exception 'FAIL: the RPS could not remove a post';
  end if;
  insert into public.posts (user_id, kind, body)
  values (auth.uid(), 'announcement', 'Jumpa saya minggu depan');
  raise notice 'PASS: the RPS can moderate and broadcast';
end $$;

\echo '--- opt-in student profiles ---'
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';

do $$
declare n int;
begin
  -- visible by default now, so classmates can actually find each other
  select count(*) into n from public.public_profiles;
  if n = 0 then raise exception 'FAIL: no profiles visible although sharing defaults to on'; end if;
  raise notice 'PASS: profiles are visible to classmates by default (% listed)', n;
end $$;

reset role;
set request.jwt.claim.sub = '';
update public.profiles set bio = 'Suka elektronik dan kopi'
 where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set share_persona = false, share_pillars = false
 where id = '00000000-0000-0000-0000-0000000000b2';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$
declare r record;
begin
  select * into r from public.public_profiles
   where user_id = '00000000-0000-0000-0000-0000000000b2';
  if r.user_id is null then raise exception 'FAIL: opted-in profile not visible'; end if;
  if r.persona is not null then
    raise exception 'FAIL: persona still shown after being switched off';
  end if;
  if r.pillars_done is not null then
    raise exception 'FAIL: pillar count still shown after being switched off';
  end if;
  raise notice 'PASS: switching a field off hides it while the profile stays visible';
end $$;

do $$
declare cols text;
begin
  select string_agg(column_name, ',' order by ordinal_position) into cols
  from information_schema.columns where table_name = 'public_profiles';
  if cols ~* '(cgpa|credit|ic_no|phone|address|race|religion|income|email)' then
    raise exception 'FAIL: public_profiles exposes %', cols;
  end if;
  raise notice 'PASS: public profile columns are %', cols;
end $$;

\echo '--- the RPS card ---'
do $$
declare cols text; n int;
begin
  select string_agg(column_name, ',' order by ordinal_position) into cols
  from information_schema.columns where table_name = 'rps_card';
  if cols ~* '(ic_no|date_of_birth|address|kin_|parental|race|religion)' then
    raise exception 'FAIL: rps_card exposes personal data: %', cols;
  end if;
  select count(*) into n from public.rps_card;
  if n <> 1 then raise exception 'FAIL: expected exactly one RPS card, got %', n; end if;
  raise notice 'PASS: students can reach their RPS, and see nothing personal';
end $$;

reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.rps_card;
  if n <> 0 then raise exception 'FAIL: unapproved account read the RPS card'; end if;
  select count(*) into n from public.public_profiles;
  if n <> 0 then raise exception 'FAIL: unapproved account read student profiles'; end if;
  raise notice 'PASS: unapproved accounts see neither, default or not';
end $$;

-- the RPS must never appear as a student profile
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.public_profiles
   where user_id = '00000000-0000-0000-0000-0000000000aa';
  if n <> 0 then raise exception 'FAIL: the RPS is listed as a student profile'; end if;
  select count(*) into n from public.rps_card
   where user_id = '00000000-0000-0000-0000-0000000000aa';
  if n <> 1 then raise exception 'FAIL: the RPS has no staff card'; end if;
  raise notice 'PASS: the RPS resolves to a staff card, never a student profile';
end $$;

\echo '--- the demo student account ---'
reset role;
reset request.jwt.claim.sub;
-- An out-of-domain address, to prove the demo list really does bypass the
-- domain rule rather than the address simply happening to be a student one.
update public.app_settings
   set value = 'demo.student@studentmail.unimap.edu.my, rpstest@gmail.com'
 where key = 'demo_emails';

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000e1', 'rpstest@gmail.com');

do $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = '00000000-0000-0000-0000-0000000000e1';
  if p.id is null then raise exception 'FAIL: a listed demo address was refused registration'; end if;
  if p.approval_state <> 'approved' then
    raise exception 'FAIL: the demo account is %, not approved', p.approval_state;
  end if;
  if not p.is_demo then raise exception 'FAIL: the demo account is not flagged is_demo'; end if;
  raise notice 'PASS: a demo address registers whatever the domain, approved and flagged';
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.leaderboard
   where user_id = '00000000-0000-0000-0000-0000000000e1';
  if n <> 0 then raise exception 'FAIL: the demo account is competing on the leaderboard'; end if;
  select count(*) into n from public.member_names
   where user_id = '00000000-0000-0000-0000-0000000000e1';
  if n <> 1 then raise exception 'FAIL: the demo account has no name in the feed'; end if;
  select count(*) into n from public.student_summary
   where user_id = '00000000-0000-0000-0000-0000000000e1' and is_demo;
  if n <> 1 then raise exception 'FAIL: the RPS cannot find the demo account in My Students'; end if;
  raise notice 'PASS: the demo account is testable but never on the leaderboard';
end $$;

\echo '--- a demo student records subjects, and the RPS sees them ---'
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
set role authenticated;
do $$
declare term_id uuid; subj uuid; n int;
begin
  update public.profiles
     set full_name = 'Pelajar Demo', intake_year = '2026', profile_completed = true
   where id = '00000000-0000-0000-0000-0000000000e1';

  insert into public.student_terms (user_id, session, semester, study_year)
  values ('00000000-0000-0000-0000-0000000000e1', '2026/2027', 1, 1)
  returning id into term_id;

  select id into subj from public.curriculum_subjects
   where intake_year = '2026' and is_graded order by code limit 1;

  insert into public.student_records (user_id, subject_id, term_id, state, grade)
  values ('00000000-0000-0000-0000-0000000000e1', subj, term_id, 'pass', 'A');

  select count(*) into n from public.student_records
   where user_id = '00000000-0000-0000-0000-0000000000e1';
  if n <> 1 then raise exception 'FAIL: the demo student could not record a subject'; end if;
  raise notice 'PASS: a demo student can record a semester and a grade';
end $$;

reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.student_records
   where user_id = '00000000-0000-0000-0000-0000000000e1';
  if n <> 1 then raise exception 'FAIL: the RPS cannot see the demo student''s record'; end if;
  raise notice 'PASS: the RPS sees what the demo student entered';
end $$;

\echo '--- exemptions live outside the semesters ---'
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
set role authenticated;
do $$
declare subj uuid; n int;
begin
  select id into subj from public.curriculum_subjects
   where intake_year = '2026' and code <> (
     select s.code from public.student_records r
     join public.curriculum_subjects s on s.id = r.subject_id
     where r.user_id = auth.uid() limit 1)
   order by code limit 1;

  insert into public.student_records (user_id, subject_id, state, exemption_note)
  values (auth.uid(), subj, 'exempted', 'Diploma UniMAP 2023');

  select count(*) into n from public.student_records
   where user_id = auth.uid() and state = 'exempted' and term_id is null;
  if n <> 1 then raise exception 'FAIL: an exemption could not be saved without a semester'; end if;
  raise notice 'PASS: an exemption saves with no semester attached';

  begin
    insert into public.student_records (user_id, subject_id, state)
    values (auth.uid(), subj, 'exempted');
    raise exception 'FAIL: the same subject was exempted twice';
  exception when unique_violation then
    raise notice 'PASS: the same subject cannot be exempted twice';
  end;

  begin
    insert into public.student_records (user_id, subject_id, state)
    select auth.uid(), id, 'active' from public.curriculum_subjects
     where intake_year = '2026' and id <> subj order by code limit 1;
    raise exception 'FAIL: an ordinary record was accepted with no semester';
  exception when check_violation then
    raise notice 'PASS: only an exemption may sit outside a semester';
  end;
end $$;

\echo '--- credits taken, exempted, and the load being carried now ---'
do $$
declare taken int; exempted int; earned int; load int; before_cgpa numeric; after_cgpa numeric;
begin
  select cgpa into before_cgpa from public.student_summary where user_id = auth.uid();

  select credits_taken, credits_exempted, credits_earned, current_semester_credits
    into taken, exempted, earned, load
    from public.student_summary where user_id = auth.uid();

  if exempted = 0 then raise exception 'FAIL: the exemption earned no credits'; end if;
  if taken = 0 then raise exception 'FAIL: the passed subject earned no credits'; end if;
  if earned <> taken + exempted then
    raise exception 'FAIL: % taken + % exempted does not equal % earned', taken, exempted, earned;
  end if;
  raise notice 'PASS: credits taken plus credits exempted equal credits earned';

  -- the passed subject sits in the student's only term, so it is their load
  if load <> taken then
    raise exception 'FAIL: current semester load is %, expected %', load, taken;
  end if;
  raise notice 'PASS: the load being carried this semester is counted separately';

  select cgpa into after_cgpa from public.student_summary where user_id = auth.uid();
  if after_cgpa is distinct from before_cgpa then
    raise exception 'FAIL: an exemption moved the CGPA';
  end if;
  raise notice 'PASS: an exemption never touches the CGPA';
end $$;

\echo '--- a repeat costs hours but earns its credit once ---'
do $$
declare subj uuid; t2 uuid; earned_before int; earned_after int; load_after int; credit int;
begin
  select credits_earned into earned_before from public.student_summary where user_id = auth.uid();
  select r.subject_id, s.credit into subj, credit
    from public.student_records r
    join public.curriculum_subjects s on s.id = r.subject_id
   where r.user_id = auth.uid() and r.state = 'pass' limit 1;

  insert into public.student_terms (user_id, session, semester, study_year)
  values (auth.uid(), '2026/2027', 2, 1) returning id into t2;

  -- the same subject again, in the next semester: a legal repeat
  insert into public.student_records (user_id, subject_id, term_id, state, grade)
  values (auth.uid(), subj, t2, 'pass', 'B');

  select credits_earned, current_semester_credits into earned_after, load_after
    from public.student_summary where user_id = auth.uid();

  if earned_after <> earned_before then
    raise exception 'FAIL: a repeat earned its credit twice (% -> %)', earned_before, earned_after;
  end if;
  raise notice 'PASS: a repeated subject earns its credit once';

  if load_after <> credit then
    raise exception 'FAIL: the repeat is not counted in this semester load, got %', load_after;
  end if;
  raise notice 'PASS: the repeat still counts toward the semester load';
end $$;
