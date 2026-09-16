-- ============================================================================
--  myRPS — FIX MY LOGIN
--
--  Run this ONCE, after RUN_THIS_IN_SUPABASE.sql. It repairs a bug that
--  stopped the RPS's own staff address from registering.
--
--  HOW TO USE
--    1. Change the email on the ONE marked line below
--    2. Supabase → SQL Editor → New query → paste all of this → Run
--    3. Go to the site and register with that address
--
--  It prints a small table at the end saying what it changed.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  STEP 1 of 3 — your details.  THIS IS THE ONLY LINE YOU EDIT.
-- ---------------------------------------------------------------------------
do $myrps$
declare
  -- vvvvvvvvvvvvvv  PUT YOUR EMAIL BETWEEN THE QUOTES  vvvvvvvvvvvvvv
  my_email text := 'zamrizahir@unimap.edu.my';
  -- ^^^^^^^^^^^^^^  PUT YOUR EMAIL BETWEEN THE QUOTES  ^^^^^^^^^^^^^^
begin
  -- Accept staff addresses as well as student ones, from now on.
  update public.app_settings
     set value = 'studentmail.unimap.edu.my,unimap.edu.my'
   where key = 'allowed_email_domain';

  -- Remember this address as the RPS admin.
  update public.app_settings
     set value = my_email
   where key = 'bootstrap_admin_email';

  -- If that account already exists, make it the admin now.
  insert into public.admins (user_id, note)
  select u.id, 'promoted by FIX_MY_LOGIN.sql'
    from auth.users u
   where lower(u.email) = lower(my_email)
  on conflict (user_id) do nothing;

  update public.profiles p
     set approval_state  = 'approved',
         approved_at     = coalesce(p.approved_at, now()),
         consent_version = coalesce(p.consent_version, '2025-v1'),
         consent_at      = coalesce(p.consent_at, now())
    from auth.users u
   where u.id = p.id
     and lower(u.email) = lower(my_email);
end
$myrps$;


-- ---------------------------------------------------------------------------
--  STEP 2 of 3 — teach the signup check to accept a list of domains.
--  Nothing to edit here.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  allowed text;
  bootstrap text;
begin
  select value into allowed from public.app_settings where key = 'allowed_email_domain';
  select value into bootstrap from public.app_settings where key = 'bootstrap_admin_email';

  if allowed is not null and allowed <> ''
     and not exists (
       select 1
       from unnest(string_to_array(allowed, ',')) as d
       where lower(new.email) like '%@' || lower(btrim(d))
     )
     and lower(new.email) <> lower(coalesce(bootstrap, '')) then
    raise exception 'Registration is limited to these domains: %', allowed
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email_official, approval_state)
  values (
    new.id,
    new.email,
    (case
       when lower(new.email) = lower(coalesce(bootstrap, '')) then 'approved'
       else 'pending'
     end)::public.approval_state
  )
  on conflict (id) do nothing;

  if bootstrap is not null and lower(new.email) = lower(bootstrap) then
    insert into public.admins (user_id, note) values (new.id, 'bootstrap admin')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$fn$;


-- ---------------------------------------------------------------------------
--  STEP 3 of 3 — let this SQL editor repair accounts.
--  Nothing to edit here.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.approval_state   := old.approval_state;
  new.approved_at      := old.approved_at;
  new.approved_by      := old.approved_by;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$fn$;


-- ---------------------------------------------------------------------------
--  Result
-- ---------------------------------------------------------------------------
select 'domains now allowed' as item,
       (select value from public.app_settings where key = 'allowed_email_domain') as value
union all
select 'admin address',
       (select value from public.app_settings where key = 'bootstrap_admin_email')
union all
select 'that account registered?',
       case when exists (
              select 1 from auth.users
               where lower(email) = lower((select value from public.app_settings
                                            where key = 'bootstrap_admin_email')))
            then 'yes' else 'not yet - go and register now, it will work' end
union all
select 'is admin',
       case when exists (
              select 1 from public.admins a join auth.users u on u.id = a.user_id
               where lower(u.email) = lower((select value from public.app_settings
                                              where key = 'bootstrap_admin_email')))
            then 'YES' else 'will happen automatically when you register' end;
