-- ============================================================================
--  myRPS — MAKE ME THE ADMIN
--
--  Use this if you have already registered on the site but do not see the
--  "RPS Panel" tab. It promotes your existing account instead of making you
--  start again.
--
--  HOW TO USE
--   1. Change the email on the line below to the one you registered with
--   2. Supabase → SQL Editor → New query → paste all of this → Run
--   3. Sign out of myRPS and sign back in
--
--  It prints a result table at the end telling you whether it worked.
-- ============================================================================

-- ↓↓↓ CHANGE THIS LINE, AND ONLY THIS LINE ↓↓↓
\set my_email 'zamrizahir@unimap.edu.my'
-- ↑↑↑ CHANGE THIS LINE, AND ONLY THIS LINE ↑↑↑


-- 1. Fix the guard so the SQL editor is allowed to repair accounts.
--    (Earlier versions blocked even you from doing this by hand.)
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.uid() is null when there is no logged-in user: the SQL Editor, the
  -- Table Editor, the service role. Those are already trusted, and the RPS
  -- must be able to repair an account by hand.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.approval_state   := old.approval_state;
  new.approved_at      := old.approved_at;
  new.approved_by      := old.approved_by;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$$;

-- 2. Remember this address, so a future re-registration is admin automatically.
update public.app_settings
   set value = :'my_email'
 where key = 'bootstrap_admin_email';

-- 3. Make that account an admin.
insert into public.admins (user_id, note)
select u.id, 'promoted via MAKE_ME_ADMIN.sql'
  from auth.users u
 where lower(u.email) = lower(:'my_email')
on conflict (user_id) do nothing;

-- 4. Approve it, so the approval gate lets it through.
update public.profiles p
   set approval_state = 'approved',
       approved_at = coalesce(p.approved_at, now())
  from auth.users u
 where u.id = p.id
   and lower(u.email) = lower(:'my_email');

-- 5. Skip the student consent screen for the RPS account.
update public.profiles p
   set consent_version = coalesce(p.consent_version, '2025-v1'),
       consent_at = coalesce(p.consent_at, now())
  from auth.users u
 where u.id = p.id
   and lower(u.email) = lower(:'my_email');


-- ============================================================================
--  Result. All three rows should say OK.
-- ============================================================================
select 'account exists' as check,
       case when exists (select 1 from auth.users
                          where lower(email) = lower(:'my_email'))
            then 'OK' else 'NOT FOUND — register on the site first' end as result
union all
select 'is admin',
       case when exists (select 1 from public.admins a
                           join auth.users u on u.id = a.user_id
                          where lower(u.email) = lower(:'my_email'))
            then 'OK' else 'FAILED' end
union all
select 'approved',
       coalesce((select case when p.approval_state = 'approved' then 'OK'
                             else 'still ' || p.approval_state end
                   from public.profiles p
                   join auth.users u on u.id = p.id
                  where lower(u.email) = lower(:'my_email')),
                'no profile row');
