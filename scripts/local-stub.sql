-- Minimal stand-ins for the pieces Supabase provides, so the migrations in
-- supabase/ can be run against a plain PostgreSQL instance for verification.
-- This file is a TEST HARNESS. Never run it against a real Supabase project.

create extension if not exists "pgcrypto";

do $$ begin create role anon nologin noinherit;           exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin noinherit;  exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin noinherit bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Supabase derives this from the request JWT. Here it reads a session GUC so a
-- test can say "now I am this user".
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select string_to_array(name, '/');
$$;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
