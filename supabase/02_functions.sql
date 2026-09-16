-- =====================================================================
-- myRPS — 02_functions.sql   (run SECOND)
-- Helper functions, signup gate, and the admin-only actions.
-- =====================================================================

-- ---------- helpers ----------------------------------------------------------
-- security definer so a student can ask "am I an admin?" without being able to
-- read the admins table itself. search_path is pinned — without that, a
-- malicious search_path can hijack the function body.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approval_state = 'approved'
  );
$$;

-- ---------- keep updated_at honest -------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists records_touch on public.student_records;
create trigger records_touch before update on public.student_records
  for each row execute function public.touch_updated_at();

-- ---------- signup gate ------------------------------------------------------
-- Fires when Supabase Auth creates a user. Two jobs:
--   1. reject any address outside the allowed domain,
--   2. create the pending profile row.
-- The frontend checks the domain too, but only this check is enforceable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed text;
  bootstrap text;
begin
  select value into allowed from public.app_settings where key = 'allowed_email_domain';
  select value into bootstrap from public.app_settings where key = 'bootstrap_admin_email';

  if allowed is not null and allowed <> ''
     and lower(new.email) not like '%@' || lower(allowed)
     and lower(new.email) <> lower(coalesce(bootstrap, '')) then
    raise exception 'Registration is limited to @% addresses.', allowed
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

  -- The very first account, if it matches bootstrap_admin_email, becomes the RPS.
  if bootstrap is not null and lower(new.email) = lower(bootstrap) then
    insert into public.admins (user_id, note) values (new.id, 'bootstrap admin')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- students must not be able to approve themselves ------------------
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.uid() is null when there is no logged-in user: the Supabase SQL
  -- Editor, the Table Editor, and anything using the service role. Those are
  -- already fully trusted, and the RPS must be able to repair an account by
  -- hand -- for example after registering before bootstrap_admin_email was
  -- set. Without this, the fix silently does nothing.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  -- Silently pin the privileged columns back to their stored values rather than
  -- erroring, so an ordinary profile save still succeeds.
  new.approval_state   := old.approval_state;
  new.approved_at      := old.approved_at;
  new.approved_by      := old.approved_by;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ---------- admin actions (the only way approval state changes) --------------
create or replace function public.admin_set_approval(
  target uuid,
  new_state approval_state,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only.' using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
     set approval_state   = new_state,
         approved_at      = case when new_state = 'approved' then now() else null end,
         approved_by      = case when new_state = 'approved' then auth.uid() else null end,
         rejection_reason = reason
   where id = target;

  insert into public.audit_log (actor_id, action, target_user, detail)
  values (auth.uid(), 'set_approval', target, jsonb_build_object('state', new_state, 'reason', reason));
end;
$$;

-- Clears the one-attempt lock so the student can retake the psychometric test.
-- History is kept; the next attempt gets the next attempt_no.
create or replace function public.admin_reset_psychometric(target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.audit_log (actor_id, action, target_user, detail)
  values (auth.uid(), 'reset_psychometric', target,
          jsonb_build_object('attempts_before',
            (select count(*) from public.psychometric_attempts where user_id = target)));
end;
$$;

-- True when the student may start a test: never taken one, or the RPS has
-- reset them since their last attempt.
create or replace function public.can_take_psychometric()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with last_attempt as (
    select max(a.taken_at) as at
    from public.psychometric_attempts a
    where a.user_id = auth.uid()
  ),
  last_reset as (
    select max(l.created_at) as at
    from public.audit_log l
    where l.target_user = auth.uid() and l.action = 'reset_psychometric'
  )
  select case
    -- never taken it
    when (select at from last_attempt) is null then true
    -- taken it: only a reset that came AFTER the last attempt reopens it.
    -- coalesce defaults to FALSE here on purpose. Defaulting to true would
    -- mean "no reset recorded" reads as "go ahead", which is the opposite of
    -- what a one-attempt lock is for.
    else coalesce((select at from last_reset) > (select at from last_attempt), false)
  end;
$$;

create or replace function public.admin_verify_meeting(meeting_id uuid, value boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only.' using errcode = 'insufficient_privilege';
  end if;
  update public.meetings
     set verified = value, verified_at = case when value then now() else null end
   where id = meeting_id;
end;
$$;

-- Lets a student erase their own account and everything attached to it (PDPA).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  insert into public.audit_log (actor_id, action, target_user, detail)
  values (auth.uid(), 'self_delete', auth.uid(), '{}'::jsonb);
  -- cascades through every table that references profiles / auth.users
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.admin_set_approval(uuid, approval_state, text) from anon;
revoke all on function public.admin_reset_psychometric(uuid) from anon;
revoke all on function public.admin_verify_meeting(uuid, boolean) from anon;
revoke all on function public.delete_my_account() from anon;
