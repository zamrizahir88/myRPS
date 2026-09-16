-- =====================================================================
-- myRPS — 04_views.sql   (run FOURTH)
-- Derived numbers: credits, indicative GPA, the safe leaderboard.
-- =====================================================================

-- One row per subject a student has cleared, using their best (latest) attempt.
-- Without the distinct-on, a subject taken three times would be counted three
-- times and a student could show 180 / 140 credits.
create or replace view public.v_cleared_subjects
with (security_invoker = on) as
select distinct on (r.user_id, r.subject_id)
  r.user_id,
  r.subject_id,
  s.credit,
  s.category,
  s.counts_to_total
from public.student_records r
join public.curriculum_subjects s on s.id = r.subject_id
where r.state in ('pass', 'exempted')
order by r.user_id, r.subject_id, r.attempt_no desc;

-- Latest graded attempt per subject. This is the CGPA rule from the RPS
-- Panduan: when a course has been repeated, the failed attempt drops out of
-- both the numerator and the denominator.
create or replace view public.v_gpa_attempts
with (security_invoker = on) as
select distinct on (r.user_id, r.subject_id)
  r.user_id,
  r.subject_id,
  r.semester_taken,
  s.credit,
  g.points
from public.student_records r
join public.curriculum_subjects s on s.id = r.subject_id
join public.grade_scale g on g.grade = r.grade
where s.is_graded
  and r.grade is not null
  and r.state in ('pass', 'fail')
order by r.user_id, r.subject_id, r.attempt_no desc;

-- Indicative CGPA. Indicative, not official — it is computed from what the
-- student typed in, and AMIS remains the source of truth.
create or replace view public.v_student_cgpa
with (security_invoker = on) as
select
  user_id,
  round(sum(points * credit) / nullif(sum(credit), 0), 2) as cgpa,
  sum(credit) as graded_credits
from public.v_gpa_attempts
group by user_id;

-- Semester-by-semester GPA, for the trend chart and the improvement badge.
create or replace view public.v_semester_gpa
with (security_invoker = on) as
select
  user_id,
  semester_taken,
  round(sum(points * credit) / nullif(sum(credit), 0), 2) as gpa,
  sum(credit) as credits
from public.v_gpa_attempts
where semester_taken is not null
group by user_id, semester_taken;

-- Credits passed per semester — the input to the Continuous Improvement badge.
create or replace view public.v_semester_passes
with (security_invoker = on) as
select
  r.user_id,
  r.semester_taken,
  count(*) filter (where r.state = 'pass') as passed_subjects
from public.student_records r
where r.semester_taken is not null
group by r.user_id, r.semester_taken;

-- The RPS master list. security_invoker = on means a student querying this
-- sees only their own row; the RPS sees everyone.
create or replace view public.student_summary
with (security_invoker = on) as
select
  p.id                              as user_id,
  p.full_name,
  p.matric_no,
  p.approval_state,
  p.programme_code,
  p.intake_year,
  p.profile_completed,
  p.career_goal,
  coalesce(c.earned, 0)             as credits_earned,
  coalesce(req.required, 140)       as credits_required,
  g.cgpa,
  coalesce(pil.done, 0)             as pillars_done,
  coalesce(m.total, 0)              as meetings_total,
  coalesce(m.verified, 0)           as meetings_verified,
  m.last_meeting_at,
  coalesce(f.open_fails, 0)         as open_fails,
  exists (select 1 from public.psychometric_attempts a where a.user_id = p.id) as has_psychometric
from public.profiles p
left join (
  select user_id, sum(credit) as earned
  from public.v_cleared_subjects where counts_to_total group by user_id
) c on c.user_id = p.id
left join lateral (
  select sum(cr.required_credits) as required
  from public.curriculum_requirements cr
  where cr.programme_code = p.programme_code
    and cr.intake_year = p.intake_year
) req on true
left join public.v_student_cgpa g on g.user_id = p.id
left join (
  select user_id, count(*) as done from public.pillar_completions group by user_id
) pil on pil.user_id = p.id
left join (
  select user_id,
         count(*) as total,
         count(*) filter (where verified) as verified,
         max(meeting_at) as last_meeting_at
  from public.meetings group by user_id
) m on m.user_id = p.id
left join (
  -- a fail with no later passing attempt of the same subject
  select r.user_id, count(*) as open_fails
  from public.student_records r
  where r.state = 'fail'
    and not exists (
      select 1 from public.student_records r2
      where r2.user_id = r.user_id and r2.subject_id = r.subject_id
        and r2.state in ('pass', 'exempted')
    )
  group by r.user_id
) f on f.user_id = p.id;

-- ---------------------------------------------------------------------
-- THE LEADERBOARD
--
-- This one is deliberately security_invoker = OFF: it runs with the view
-- owner's rights and so reads past RLS. That is the point — every approved
-- student needs to see every other student's engagement score. Because it
-- bypasses RLS, the column list IS the privacy boundary: name and engagement
-- only. No CGPA, no credits, no fails, no IC, no contact details.
--
-- Do not add a column here without asking whether the whole cohort may see it.
-- ---------------------------------------------------------------------
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
left join (
  select user_id, count(*) as done from public.pillar_completions group by user_id
) pil on pil.user_id = p.id
left join (
  select user_id, count(*) filter (where verified) as verified
  from public.meetings group by user_id
) m on m.user_id = p.id
left join lateral (
  -- passed more subjects this semester than last
  select (
    select sp.passed_subjects from public.v_semester_passes sp
    where sp.user_id = p.id order by sp.semester_taken desc limit 1
  ) > (
    select sp.passed_subjects from public.v_semester_passes sp
    where sp.user_id = p.id order by sp.semester_taken desc offset 1 limit 1
  ) as improving
) imp on true
where p.approval_state = 'approved'
  -- the RPS is approved too, but ranking the advisor among their own advisees
  -- is nonsense; keep the board to students.
  and not exists (select 1 from public.admins a where a.user_id = p.id)
  -- Because this view runs with the owner's rights it does NOT inherit the RLS
  -- on profiles, so it has to check the caller itself. Without this line any
  -- account that merely completed signup — pending, rejected, anybody with a
  -- student address — could list every advisee by name.
  and (public.is_approved() or public.is_admin());

revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;

-- Chat needs display names for people other than yourself, and profiles is
-- locked to your own row. Same pattern: bypasses RLS, exposes name only.
create or replace view public.member_names
with (security_invoker = off) as
-- avatar_path is deliberately absent: avatars live in a private bucket that
-- only the owner and the RPS may read, so chat shows initials instead.
-- Unlike the leaderboard this DOES include the RPS, otherwise their own chat
-- messages and announcements would show up with no name against them.
select p.id as user_id, p.full_name
from public.profiles p
where p.approval_state = 'approved'
  -- same reasoning as the leaderboard: owner's rights, so check the caller.
  and (public.is_approved() or public.is_admin());

revoke all on public.member_names from anon;
grant select on public.member_names to authenticated;
