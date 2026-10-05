-- =====================================================================
-- myRPS — 17_presence.sql   (run SEVENTEENTH)
--
-- Who is here. The feed shows which classmates are online and when each was
-- last active, and a student's own profile shows when they last signed in.
--
-- There is no switch to hide it. That is the RPS's rule for this cohort: the
-- room only works if people can see who else is in it. What is shown is a
-- time and nothing else — never what somebody was looking at.
--
-- The times are the server's, written by the two functions below for the
-- caller's own account only. Nobody can write the table directly, so nobody
-- can appear online while away or backdate somebody else.
-- =====================================================================

create table if not exists public.user_activity (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  last_active_at  timestamptz not null default now(),
  last_login_at   timestamptz,   -- the sign-in they are using now
  prev_login_at   timestamptz    -- the one before it
);

alter table public.user_activity enable row level security;

-- Your own sign-in times, and the RPS's view of everyone's. Classmates read
-- last_active_at through member_presence below, never this table.
drop policy if exists activity_select_own on public.user_activity;
create policy activity_select_own on public.user_activity for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

revoke all on public.user_activity from anon, authenticated;
grant select on public.user_activity to authenticated;

-- ---------- "I am still here" -------------------------------------------------
-- The app calls this about once a minute while it is open and on screen. The
-- 20-second floor keeps two open tabs from doubling the writes.
create or replace function public.touch_activity()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.user_activity (user_id, last_active_at)
  select auth.uid(), now()
   where auth.uid() is not null
  on conflict (user_id) do update
    set last_active_at = excluded.last_active_at
    where public.user_activity.last_active_at < now() - interval '20 seconds';
$$;

-- ---------- "I have just signed in" -------------------------------------------
-- Called once, by the sign-in form. Hands back the sign-in before this one so
-- the app can say "last login: …" — the point being that a student notices a
-- login that was not theirs.
create or replace function public.record_login()
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  previous timestamptz;
begin
  if auth.uid() is null then
    return null;
  end if;

  select a.last_login_at into previous
    from public.user_activity a where a.user_id = auth.uid();

  insert into public.user_activity (user_id, last_active_at, last_login_at)
  values (auth.uid(), now(), now())
  on conflict (user_id) do update
    set prev_login_at  = public.user_activity.last_login_at,
        last_login_at  = now(),
        last_active_at = now();

  return previous;
end;
$$;

revoke all on function public.touch_activity() from public, anon;
revoke all on function public.record_login() from public, anon;
grant execute on function public.touch_activity() to authenticated;
grant execute on function public.record_login() to authenticated;

-- ---------- what classmates see ----------------------------------------------
-- Owner's rights, so the column list is the boundary: name, photo, a time.
-- is_online is decided here rather than in the browser because a phone's clock
-- can be minutes out. Three minutes covers one missed heartbeat.
--
-- Demo accounts are test data: the RPS sees them, and the demo account sees
-- itself, but they are not part of the cohort.
create or replace view public.member_presence
with (security_invoker = off) as
select
  p.id            as user_id,
  p.full_name,
  p.avatar_path,
  exists (select 1 from public.admins ad where ad.user_id = p.id) as is_staff,
  a.last_active_at,
  coalesce(a.last_active_at > now() - interval '3 minutes', false) as is_online
from public.profiles p
left join public.user_activity a on a.user_id = p.id
where p.approval_state = 'approved'
  and (not p.is_demo or p.id = auth.uid() or public.is_admin())
  and (public.is_approved() or public.is_admin());

revoke all on public.member_presence from anon;
grant select on public.member_presence to authenticated;
