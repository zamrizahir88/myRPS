-- =====================================================================
-- myRPS — 09_terms.sql   (run NINTH, after 08)
--
-- Records what a student ACTUALLY took, term by term, instead of assuming
-- they follow the printed curriculum. Students repeat, defer, take courses
-- early or carry one forward; the curriculum's planned_semester is now only a
-- suggestion for ordering the picker.
-- =====================================================================

-- ---------- a term is Year N · Semester N · Session YYYY/YYYY ---------------
create table if not exists public.student_terms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  session     text not null check (session ~ '^\d{4}/\d{4}$'),   -- '2026/2027'
  semester    int  not null check (semester in (1, 2, 3)),       -- 3 = Tambahan/Khas
  study_year  int  not null check (study_year between 1 and 8),
  created_at  timestamptz not null default now(),
  -- one Semester 1 of 2026/2027 per student; a subject repeated later simply
  -- lands in a different term
  unique (user_id, session, semester)
);

create index if not exists student_terms_user_idx on public.student_terms (user_id);

-- Sortable key for "which term came first": '2026/2027-1' < '2026/2027-2'.
create or replace function public.term_key(session text, semester int)
returns text language sql immutable as $$
  select session || '-' || semester::text;
$$;

-- ---------- attach records to terms -----------------------------------------
alter table public.student_records
  add column if not exists term_id uuid references public.student_terms (id) on delete cascade;

create index if not exists student_records_term_idx on public.student_records (term_id);

-- A subject may appear once per term, and in as many terms as needed. This is
-- what makes repeats work: SMQ11103 in 2026/2027-1 and again in 2027/2028-1
-- are two rows, both legal.
create unique index if not exists student_records_subject_per_term
  on public.student_records (user_id, subject_id, term_id)
  where term_id is not null;

-- The old constraint keyed on attempt_no, which forced the student to number
-- their own retakes. The term now says which attempt came when.
alter table public.student_records
  drop constraint if exists student_records_user_id_subject_id_attempt_no_key;

-- ---------- demo / test accounts --------------------------------------------
-- Lets the RPS create a throwaway student to try the student side, and keep it
-- out of the real lists afterwards.
alter table public.profiles
  add column if not exists is_demo boolean not null default false;

insert into public.app_settings (key, value)
values ('demo_emails', '')
on conflict (key) do nothing;
comment on table public.app_settings is
  'demo_emails: comma-separated addresses allowed to register regardless of domain, flagged as test accounts.';

-- ---------- signup: allow the demo list, and flag those accounts -------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  allowed text;
  bootstrap text;
  demos text;
  is_demo_account boolean := false;
begin
  select value into allowed   from public.app_settings where key = 'allowed_email_domain';
  select value into bootstrap from public.app_settings where key = 'bootstrap_admin_email';
  select value into demos     from public.app_settings where key = 'demo_emails';

  is_demo_account := demos is not null and demos <> '' and exists (
    select 1 from unnest(string_to_array(demos, ',')) as e
    where lower(btrim(e)) = lower(new.email)
  );

  if allowed is not null and allowed <> ''
     and not exists (
       select 1 from unnest(string_to_array(allowed, ',')) as d
       where lower(new.email) like '%@' || lower(btrim(d))
     )
     and lower(new.email) <> lower(coalesce(bootstrap, ''))
     and not is_demo_account then
    raise exception 'Registration is limited to these domains: %', allowed
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email_official, approval_state, is_demo)
  values (
    new.id,
    new.email,
    (case
       -- a demo account is approved immediately; it exists to be tested with
       when lower(new.email) = lower(coalesce(bootstrap, '')) or is_demo_account then 'approved'
       else 'pending'
     end)::public.approval_state,
    is_demo_account
  )
  on conflict (id) do nothing;

  if bootstrap is not null and lower(new.email) = lower(bootstrap) then
    insert into public.admins (user_id, note) values (new.id, 'bootstrap admin')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$fn$;

-- ---------- permissions ------------------------------------------------------
alter table public.student_terms enable row level security;

drop policy if exists terms_rw on public.student_terms;
create policy terms_rw on public.student_terms for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

revoke all on public.student_terms from anon;
grant select, insert, update, delete on public.student_terms to authenticated;


-- ============================================================================
--  Views, rebuilt around terms.
--
--  "Which attempt counts" is now decided by WHEN the student took it, not by
--  an attempt number they had to type. Dropped and recreated rather than
--  replaced, because the column lists change.
-- ============================================================================

drop view if exists public.student_summary;
drop view if exists public.leaderboard;
drop view if exists public.member_names;
drop view if exists public.v_student_cgpa;
drop view if exists public.v_semester_gpa;
drop view if exists public.v_semester_passes;
drop view if exists public.v_cleared_subjects;
drop view if exists public.v_gpa_attempts;

-- Every record with its term attached and a sortable key.
create or replace view public.v_records
with (security_invoker = on) as
select
  r.id, r.user_id, r.subject_id, r.state, r.grade, r.term_id, r.attempt_no,
  t.session, t.semester, t.study_year,
  public.term_key(t.session, t.semester) as term_key,
  s.code, s.name_en, s.name_ms, s.credit, s.category,
  s.is_graded, s.counts_to_total
from public.student_records r
join public.curriculum_subjects s on s.id = r.subject_id
left join public.student_terms t on t.id = r.term_id;

-- One row per subject the student has cleared, from their most recent term.
-- A subject taken three times still counts once.
create or replace view public.v_cleared_subjects
with (security_invoker = on) as
select distinct on (user_id, subject_id)
  user_id, subject_id, credit, category, counts_to_total
from public.v_records
where state in ('pass', 'exempted')
-- Terms decide the order; attempt_no is the fallback for any row recorded
-- before terms existed, so those are not left unranked.
order by user_id, subject_id, term_key desc nulls last, attempt_no desc;

-- Latest graded attempt per subject. This is the CGPA rule from the RPS
-- Panduan: once a course is repeated, the failed attempt leaves both the
-- numerator and the denominator.
create or replace view public.v_gpa_attempts
with (security_invoker = on) as
select distinct on (user_id, subject_id)
  user_id, subject_id, term_id, session, semester, term_key, credit, grade
from public.v_records
where is_graded and grade is not null and state in ('pass', 'fail')
order by user_id, subject_id, term_key desc nulls last, attempt_no desc;

create or replace view public.v_student_cgpa
with (security_invoker = on) as
select
  a.user_id,
  round(sum(g.points * a.credit) / nullif(sum(a.credit), 0), 2) as cgpa,
  sum(a.credit) as graded_credits
from public.v_gpa_attempts a
join public.grade_scale g on g.grade = a.grade
group by a.user_id;

-- GPA for each term as it happened, including the attempt that was later
-- repeated — this is the history, not the running CGPA.
create or replace view public.v_semester_gpa
with (security_invoker = on) as
select
  r.user_id, r.term_id, r.session, r.semester, r.study_year, r.term_key,
  round(sum(g.points * r.credit) / nullif(sum(r.credit), 0), 2) as gpa,
  sum(r.credit) as credits,
  count(*) filter (where r.state = 'pass') as passed_subjects
from public.v_records r
join public.grade_scale g on g.grade = r.grade
where r.is_graded and r.grade is not null and r.state in ('pass', 'fail')
  and r.term_id is not null
group by r.user_id, r.term_id, r.session, r.semester, r.study_year, r.term_key;

create or replace view public.v_semester_passes
with (security_invoker = on) as
select user_id, term_key, count(*) filter (where state = 'pass') as passed_subjects
from public.v_records
where term_id is not null
group by user_id, term_key;

create or replace view public.student_summary
with (security_invoker = on) as
select
  p.id                        as user_id,
  p.full_name,
  p.matric_no,
  p.approval_state,
  p.programme_code,
  p.intake_year,
  p.profile_completed,
  p.career_goal,
  p.is_demo,
  exists (select 1 from public.admins a where a.user_id = p.id) as is_staff,
  coalesce(c.earned, 0)       as credits_earned,
  coalesce(req.required, 140) as credits_required,
  g.cgpa,
  cur.session                 as current_session,
  cur.semester                as current_semester,
  cur.study_year              as current_study_year,
  coalesce(pil.done, 0)       as pillars_done,
  coalesce(m.total, 0)        as meetings_total,
  coalesce(m.verified, 0)     as meetings_verified,
  m.last_meeting_at,
  coalesce(f.open_fails, 0)   as open_fails,
  exists (select 1 from public.psychometric_attempts a where a.user_id = p.id) as has_psychometric
from public.profiles p
left join (
  select user_id, sum(credit) as earned
  from public.v_cleared_subjects where counts_to_total group by user_id
) c on c.user_id = p.id
left join lateral (
  select sum(cr.required_credits) as required
  from public.curriculum_requirements cr
  where cr.programme_code = p.programme_code and cr.intake_year = p.intake_year
) req on true
left join public.v_student_cgpa g on g.user_id = p.id
left join lateral (
  select t.session, t.semester, t.study_year
  from public.student_terms t
  where t.user_id = p.id
  order by public.term_key(t.session, t.semester) desc
  limit 1
) cur on true
left join (
  select user_id, count(*) as done from public.pillar_completions group by user_id
) pil on pil.user_id = p.id
left join (
  select user_id, count(*) as total, count(*) filter (where verified) as verified,
         max(meeting_at) as last_meeting_at
  from public.meetings group by user_id
) m on m.user_id = p.id
left join (
  select r.user_id, count(*) as open_fails
  from public.v_records r
  where r.state = 'fail'
    and not exists (
      select 1 from public.v_records r2
      where r2.user_id = r.user_id and r2.subject_id = r.subject_id
        and r2.state in ('pass', 'exempted')
    )
  group by r.user_id
) f on f.user_id = p.id;
-- Staff and demo rows are NOT filtered out here. The RPS needs to see their own
-- test data when they ask for it, so the list page decides, using is_staff and
-- is_demo, and hides both by default.

-- See 04_views.sql for why these two run with the owner's rights, and why
-- their column list is the privacy boundary.
create or replace view public.leaderboard
with (security_invoker = off) as
select
  p.id                       as user_id,
  p.full_name,
  coalesce(pil.done, 0)      as pillars_done,
  coalesce(m.verified, 0)    as meetings_verified,
  coalesce(pil.done, 0) * 10 + coalesce(m.verified, 0) * 5 as points,
  coalesce(pil.done, 0) >= 7 as badge_pillars_master,
  coalesce(imp.improving, false) as badge_improving
from public.profiles p
left join (select user_id, count(*) as done from public.pillar_completions group by user_id) pil
  on pil.user_id = p.id
left join (select user_id, count(*) filter (where verified) as verified from public.meetings group by user_id) m
  on m.user_id = p.id
left join lateral (
  select (
    select sp.passed_subjects from public.v_semester_passes sp
    where sp.user_id = p.id order by sp.term_key desc limit 1
  ) > (
    select sp.passed_subjects from public.v_semester_passes sp
    where sp.user_id = p.id order by sp.term_key desc offset 1 limit 1
  ) as improving
) imp on true
where p.approval_state = 'approved'
  and not p.is_demo
  and not exists (select 1 from public.admins a where a.user_id = p.id)
  and (public.is_approved() or public.is_admin());

create or replace view public.member_names
with (security_invoker = off) as
select p.id as user_id, p.full_name
from public.profiles p
where p.approval_state = 'approved'
  and (public.is_approved() or public.is_admin());

revoke all on public.leaderboard from anon;
revoke all on public.member_names from anon;
grant select on public.leaderboard to authenticated;
grant select on public.member_names to authenticated;
grant select on public.v_records, public.v_cleared_subjects, public.v_gpa_attempts,
      public.v_student_cgpa, public.v_semester_gpa, public.v_semester_passes,
      public.student_summary to authenticated;
