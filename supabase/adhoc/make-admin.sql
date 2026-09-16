-- Promote an existing account to RPS admin.
--
--   npm run db:setup -- --adhoc supabase/adhoc/make-admin.sql --set email=you@unimap.edu.my
--
-- or from GitHub: Actions → Set up Supabase database → Run workflow,
-- put the address in the "email" box.
--
-- The address arrives as a session setting, not as text pasted into this
-- file, so nothing here needs escaping.

update public.app_settings
   set value = current_setting('myrps.email')
 where key = 'bootstrap_admin_email';

insert into public.admins (user_id, note)
select u.id, 'promoted by make-admin.sql'
  from auth.users u
 where lower(u.email) = lower(current_setting('myrps.email'))
on conflict (user_id) do nothing;

update public.profiles p
   set approval_state = 'approved',
       approved_at    = coalesce(p.approved_at, now()),
       consent_version = coalesce(p.consent_version, '2025-v1'),
       consent_at      = coalesce(p.consent_at, now())
  from auth.users u
 where u.id = p.id
   and lower(u.email) = lower(current_setting('myrps.email'));

select 'account exists' as check,
       case when exists (select 1 from auth.users
                          where lower(email) = lower(current_setting('myrps.email')))
            then 'OK' else 'NOT FOUND - register on the site first' end as result
union all
select 'is admin',
       case when exists (select 1 from public.admins a join auth.users u on u.id = a.user_id
                          where lower(u.email) = lower(current_setting('myrps.email')))
            then 'OK' else 'FAILED' end
union all
select 'approved',
       coalesce((select case when p.approval_state = 'approved' then 'OK'
                             else 'still ' || p.approval_state end
                   from public.profiles p join auth.users u on u.id = p.id
                  where lower(u.email) = lower(current_setting('myrps.email'))),
                'no profile row');
