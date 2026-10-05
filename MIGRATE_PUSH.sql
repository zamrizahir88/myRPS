-- ============================================================================
--  myRPS — PHONE NOTIFICATIONS
--
--  A new post reaches the cohort, a comment reaches the post's author, and a
--  new registration reaches you — as a notification on the phone, with the
--  app closed.
--
--  This file is one of three steps. Do them in this order:
--    1. Create the Edge Function called "push" (code: supabase/functions/push)
--    2. Give it its three secrets (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
--       VAPID_SUBJECT)
--    3. Fill in the two lines marked below, then run this file
--
--  Safe to run more than once. It adds two small tables and three triggers and
--  changes no student data. Until the two lines are filled in, nothing is
--  sent and the bell does not appear on the site.
--
--  Supabase → SQL Editor → New query → paste → Run.
-- ============================================================================

-- =====================================================================
-- myRPS — 19_push.sql   (run NINETEENTH)
--
-- Phone notifications: a new post reaches the cohort, a comment reaches the
-- post's author, and a new registration reaches the RPS — with the app closed.
--
-- Three parts work together:
--   1. This file: where each phone's subscription is kept, and triggers that
--      say "something happened" the moment a row is written.
--   2. supabase/functions/push: the Edge Function that hears that, decides who
--      should know, and sends the notifications.
--   3. The app: a bell that asks the phone's permission and saves the
--      subscription here.
--
-- Nothing is sent until two settings are filled in (see the end of this
-- file). Until then the bell does not appear and posting works as before.
-- =====================================================================

-- ---------- one row per phone that said yes ----------------------------------
-- The endpoint is an address at Google's or Apple's push service that only
-- that browser was given. Whoever holds it can make that phone buzz, so
-- students cannot read this table at all, not even their own rows: the app
-- writes through the two functions below and the Edge Function reads with the
-- service role.
create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  locale      text not null default 'ms' check (locale in ('ms', 'en')),
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- ---------- what has already been announced ----------------------------------
-- The Edge Function claims a row here before it sends. Asking it twice about
-- the same post — a retry, or somebody calling the function by hand — finds
-- the row already taken and sends nothing.
create table if not exists public.push_sent (
  kind     text not null,
  ref      uuid not null,
  sent_at  timestamptz not null default now(),
  primary key (kind, ref)
);

alter table public.push_sent enable row level security;
revoke all on public.push_sent from anon, authenticated;

-- ---------- the bell: on ------------------------------------------------------
-- A phone belongs to whoever is signed in on it now. If a classmate used it
-- before, their subscription is taken over rather than left to deliver one
-- person's notifications to another.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_locale text default 'ms'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 1000
     or char_length(p_p256dh) > 200 or char_length(p_auth) > 100 then
    raise exception 'Not a push subscription.';
  end if;

  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, locale)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth,
          case when p_locale = 'en' then 'en' else 'ms' end)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh  = excluded.p256dh,
        auth    = excluded.auth,
        locale  = excluded.locale;
end;
$$;

-- ---------- the bell: off -----------------------------------------------------
-- By endpoint alone: knowing it means being that browser.
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- ---------- "something happened" ----------------------------------------------
-- pg_net lets the database make a web request without waiting for the answer.
-- It ships with Supabase; a plain PostgreSQL used for testing does not have
-- it, and must not fail here because of that.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available — notifications will not be sent from this database.';
end $$;

-- Sends only "a post with this id exists". The Edge Function reads the row
-- itself, so nothing here has to be trusted and there is no secret to keep.
--
-- Everything is inside an exception block on purpose: a notification that
-- fails to go out must never stop the post, comment or sign-up that caused it.
create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target text;
begin
  select nullif(btrim(value), '') into target
    from public.app_settings where key = 'push_function_url';
  if target is null then
    return new;
  end if;

  perform net.http_post(
    url  := target,
    body := jsonb_build_object('kind', tg_argv[0], 'id', new.id)
  );
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.notify_push() from public, anon, authenticated;

drop trigger if exists posts_push on public.posts;
create trigger posts_push after insert on public.posts
  for each row execute function public.notify_push('post');

drop trigger if exists post_comments_push on public.post_comments;
create trigger post_comments_push after insert on public.post_comments
  for each row execute function public.notify_push('comment');

-- Only a sign-up that is waiting for the RPS. The RPS's own account and demo
-- accounts are created already approved.
drop trigger if exists profiles_push on public.profiles;
create trigger profiles_push after insert on public.profiles
  for each row when (new.approval_state = 'pending')
  execute function public.notify_push('registration');

-- ---------- the two settings --------------------------------------------------
-- Neither is a secret: the public key is what a browser subscribes with, and
-- the address is called by this database. The private key that signs each
-- notification lives only in the Edge Function's secrets.
--
--   push_public_key    the VAPID public key
--   push_function_url  https://YOUR-PROJECT-REF.supabase.co/functions/v1/push
--
-- Left empty here, which keeps the whole feature switched off.
insert into public.app_settings (key, value) values
  ('push_public_key', ''),
  ('push_function_url', '')
on conflict (key) do nothing;

-- ============================================================================
--  ↓↓↓ FILL IN THESE TWO, then remove the "--" in front of each "update" ↓↓↓
--
--  The public key is the VAPID public key (the same one you gave the Edge
--  Function). The address is your project URL followed by /functions/v1/push.
-- ============================================================================
-- update public.app_settings set value = 'PASTE-THE-VAPID-PUBLIC-KEY-HERE'
--  where key = 'push_public_key';
-- update public.app_settings set value = 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/push'
--  where key = 'push_function_url';

-- ============================================================================
--  Result — every row should say OK.
-- ============================================================================
select 'subscriptions table' as item,
       case when to_regclass('public.push_subscriptions') is not null then 'OK' else 'FAILED' end as result
union all
select 'students cannot read subscriptions',
       case when not has_table_privilege('authenticated', 'public.push_subscriptions', 'select')
            then 'OK' else 'FAILED' end
union all
select 'triggers on posts, comments and sign-ups',
       case when (select count(*) from pg_trigger
                   where tgname in ('posts_push', 'post_comments_push', 'profiles_push')) = 3
            then 'OK' else 'FAILED' end
union all
select 'database can call out (pg_net)',
       case when exists (select 1 from pg_extension where extname = 'pg_net')
            then 'OK' else 'FAILED — enable pg_net under Database → Extensions, then run this again' end
union all
select 'public key filled in',
       case when coalesce((select value from public.app_settings where key = 'push_public_key'), '') <> ''
            then 'OK' else 'NOT YET — fill in the two lines above' end
union all
select 'function address filled in',
       case when coalesce((select value from public.app_settings where key = 'push_function_url'), '') like 'https://%/functions/v1/push'
            then 'OK' else 'NOT YET — fill in the two lines above' end;
