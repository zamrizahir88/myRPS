-- =====================================================================
-- myRPS — 10_curriculum_2026.sql   (run TENTH)
--
-- The first cohort to use myRPS enters in session 2026/2027, but the only
-- curriculum versions seeded were 2022 and 2025, so the profile form offered
-- neither of the right answers. This clones the current (2025/2026 guide
-- book) structure as the 2026 version.
--
-- Clone rather than rename: the 2022 students in AMIS still follow the SMQ
-- maths codes, and their records must keep resolving.
-- =====================================================================

insert into public.curriculum_subjects
  (programme_code, intake_year, code, name_en, name_ms, credit, category,
   planned_semester, is_graded, counts_to_total, is_active)
select programme_code, '2026', code, name_en, name_ms, credit, category,
       planned_semester, is_graded, counts_to_total, is_active
from public.curriculum_subjects
where intake_year = '2025'
on conflict (programme_code, intake_year, code) do nothing;

insert into public.curriculum_requirements (programme_code, intake_year, category, required_credits)
select programme_code, '2026', category, required_credits
from public.curriculum_requirements
where intake_year = '2025'
on conflict (programme_code, intake_year, category) do update
  set required_credits = excluded.required_credits;

-- Should print 2022, 2025 and 2026, each totalling 140.
select intake_year,
       (select count(*) from public.curriculum_subjects s
         where s.intake_year = r.intake_year) as subjects,
       sum(required_credits) as total_credits
from public.curriculum_requirements r
group by intake_year
order by intake_year;
