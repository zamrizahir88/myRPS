-- =====================================================================
-- myRPS — 16_exemptions.sql   (run SIXTEENTH)
--
-- Credit exemptions (pengecualian kredit) did not happen in a semester, so
-- filing them under one was always a fiction: the student had to pick a
-- semester they never sat the subject in, and that semester then reported
-- subjects the student never took.
--
-- An exemption is now a record with no term. The database already allowed
-- that — term_id has always been nullable and the views rank term-less rows
-- last — so this migration is mostly about making the rule explicit and
-- splitting the credit totals the RPS and the student read.
-- =====================================================================

-- ---------- where the exemption came from ------------------------------------
-- 'Diploma UniMAP 2023', 'Matrikulasi', 'Credit transfer UiTM'. The faculty
-- asks for the basis; the student is the one who knows it.
alter table public.student_records
  add column if not exists exemption_note text;

-- ---------- move existing exemptions out of their semesters -------------------
-- Same subject exempted in two semesters: keep one. Nothing is lost — an
-- exemption carries no grade and no history, only the fact of it.
delete from public.student_records a
 using public.student_records b
 where a.state = 'exempted' and b.state = 'exempted'
   and a.user_id = b.user_id and a.subject_id = b.subject_id
   and a.ctid > b.ctid;

update public.student_records
   set term_id = null
 where state = 'exempted' and term_id is not null;

-- One exemption per subject per student.
create unique index if not exists student_records_one_exemption
  on public.student_records (user_id, subject_id)
  where term_id is null and state = 'exempted';

-- A record with no semester must be an exemption — or a row from before terms
-- existed, which is recognisable by the old semester_taken marker the app no
-- longer writes. NOT VALID so anything already in the table is left alone,
-- while everything written from now on is checked.
alter table public.student_records
  drop constraint if exists student_records_termless_is_exemption;
alter table public.student_records
  add constraint student_records_termless_is_exemption
  check (term_id is not null
         or state = 'exempted'
         or semester_taken is not null) not valid;

-- ---------- one place that decides what has been earned -----------------------
-- A subject appears once however many times it was taken, and a pass is banked:
-- a later failed re-sit changes the CGPA but can never take the credit back.
-- An exam pass outranks an exemption — if they sat it, that is what happened.
create or replace view public.v_earned_credits
with (security_invoker = on) as
select
  user_id,
  subject_id,
  credit,
  category,
  counts_to_total,
  case when bool_or(state = 'pass') then 'pass' else 'exempted' end as source
from public.v_records
where state in ('pass', 'exempted')
group by user_id, subject_id, credit, category, counts_to_total;

-- Kept as the name the rest of the schema already uses, now with a single
-- definition of "cleared" behind it.
create or replace view public.v_cleared_subjects
with (security_invoker = on) as
select user_id, subject_id, credit, category, counts_to_total
from public.v_earned_credits;

revoke all on public.v_earned_credits from anon;
grant select on public.v_earned_credits to authenticated;

-- ---------- the RPS reads the same split --------------------------------------
-- credits_taken, credits_exempted and current_semester_credits are appended, so
-- an existing student_summary can be replaced in place.
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
  exists (select 1 from public.psychometric_attempts a where a.user_id = p.id) as has_psychometric,
  -- credits earned by sitting the subject, credits granted as exemptions, and
  -- the load they are carrying in the semester they are in now
  coalesce(c.taken, 0)        as credits_taken,
  coalesce(c.exempted, 0)     as credits_exempted,
  coalesce(load.credits, 0)   as current_semester_credits
from public.profiles p
left join (
  select user_id,
         sum(credit)                                        as earned,
         coalesce(sum(credit) filter (where source = 'pass'), 0)     as taken,
         coalesce(sum(credit) filter (where source = 'exempted'), 0) as exempted
  from public.v_earned_credits where counts_to_total group by user_id
) c on c.user_id = p.id
left join lateral (
  select sum(cr.required_credits) as required
  from public.curriculum_requirements cr
  where cr.programme_code = p.programme_code and cr.intake_year = p.intake_year
) req on true
left join public.v_student_cgpa g on g.user_id = p.id
left join lateral (
  select t.id as term_id, t.session, t.semester, t.study_year
  from public.student_terms t
  where t.user_id = p.id
  order by public.term_key(t.session, t.semester) desc
  limit 1
) cur on true
left join lateral (
  -- Everything registered in that semester, repeats included: a repeat costs
  -- the same hours whether or not the credit is new.
  select coalesce(sum(r.credit), 0) as credits
  from public.v_records r
  where r.user_id = p.id and r.term_id = cur.term_id
    and r.state in ('active', 'pass', 'fail')
) load on true
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
