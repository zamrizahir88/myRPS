-- =====================================================================
-- myRPS — 13_profiles.sql   (run THIRTEENTH)
--
-- Two things:
--   1. Staff fields, so the RPS is not filling in a student form, and a card
--      students can actually reach their advisor with.
--   2. Opt-in student profiles: a classmate can see a face, a persona and a
--      pillar count — and nothing else, unless the student turns it on.
-- =====================================================================

alter table public.profiles
  -- staff
  add column if not exists title            text,   -- 'Ts. Dr.'
  add column if not exists position_title   text,   -- 'Pensyarah Kanan'
  add column if not exists department       text,
  add column if not exists office_location  text,
  add column if not exists whatsapp         text,
  add column if not exists cv_url           text,
  -- both roles
  add column if not exists bio              text,
  -- student sharing, all OFF by default: visibility is a choice, not a default
  add column if not exists share_profile    boolean not null default false,
  add column if not exists share_persona    boolean not null default false,
  add column if not exists share_pillars    boolean not null default false;

comment on column public.profiles.share_profile is
  'Opt-in. When false the student appears to classmates as name and photo only.';

-- ---------- the RPS card students see ---------------------------------------
-- Owner's rights, so it reaches past the profiles policy — which means the
-- column list is the boundary. Staff contact details the RPS chose to publish;
-- never their IC, date of birth, address or next of kin.
create or replace view public.rps_card
with (security_invoker = off) as
select
  p.id            as user_id,
  p.full_name,
  p.title,
  p.position_title,
  p.department,
  p.office_location,
  p.whatsapp,
  p.cv_url,
  p.bio,
  p.email_official,
  p.avatar_path
from public.profiles p
join public.admins a on a.user_id = p.id
where public.is_approved() or public.is_admin();

revoke all on public.rps_card from anon;
grant select on public.rps_card to authenticated;

-- ---------- opt-in student profiles ------------------------------------------
-- Each field is gated on its own switch, so turning the profile on does not
-- silently publish a psychometric result too.
create or replace view public.public_profiles
with (security_invoker = off) as
select
  p.id                                  as user_id,
  p.full_name,
  p.avatar_path,
  p.bio,
  cur.study_year,
  cur.semester,
  cur.session,
  case when p.share_persona then psy.strength end        as persona,
  case when p.share_pillars then coalesce(pil.done, 0) end as pillars_done,
  p.created_at                          as member_since
from public.profiles p
left join lateral (
  select t.study_year, t.semester, t.session
  from public.student_terms t
  where t.user_id = p.id
  order by public.term_key(t.session, t.semester) desc
  limit 1
) cur on true
left join lateral (
  select a.strength from public.psychometric_attempts a
  where a.user_id = p.id order by a.attempt_no desc limit 1
) psy on true
left join (
  select user_id, count(*) as done from public.pillar_completions group by user_id
) pil on pil.user_id = p.id
where p.approval_state = 'approved'
  and p.share_profile
  and not exists (select 1 from public.admins ad where ad.user_id = p.id)
  and (public.is_approved() or public.is_admin());

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------- move the WhatsApp number onto the RPS's own profile --------------
-- It was a loose row in app_settings that had to be edited in the Supabase
-- table editor. Carry across whatever is there.
update public.profiles p
   set whatsapp = coalesce(p.whatsapp,
                           nullif((select value from public.app_settings
                                    where key = 'rps_whatsapp'), ''))
 where exists (select 1 from public.admins a where a.user_id = p.id);
