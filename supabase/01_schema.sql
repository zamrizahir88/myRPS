-- =====================================================================
-- myRPS — 01_schema.sql
-- Run this FIRST in Supabase → SQL Editor → New query.
-- Creates every table. No data, no permissions yet.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- enumerated types -------------------------------------------------
do $$ begin
  create type approval_state as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Which block of the curriculum a course belongs to (UR6523007 structure).
  create type subject_category as enum (
    'core',          -- Discipline Core
    'elective',      -- Discipline Elective
    'common_core',   -- Common Core (IMQ maths/statistics)
    'university',    -- University Requirement (SMB/SMU)
    'cocurriculum',  -- SMZ co-curriculum
    'audit'          -- Audit only, no credit (e.g. SMB10102)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type record_state as enum ('planned', 'active', 'pass', 'fail', 'exempted');
exception when duplicate_object then null; end $$;

-- ---------- who is an admin --------------------------------------------------
-- Deliberately its own table. Role must never live on a row the student can
-- write, and never in auth.users.raw_user_meta_data (which any logged-in user
-- can rewrite with supabase.auth.updateUser).
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  added_at   timestamptz not null default now(),
  note       text
);

-- ---------- settings the RPS can change without a redeploy -------------------
create table if not exists public.app_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

-- ---------- student profile (AMIS-style, minus the financial fields) ---------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  approval_state      approval_state not null default 'pending',
  approved_at         timestamptz,
  approved_by         uuid references auth.users (id),
  rejection_reason    text,

  -- Personal details
  full_name           text,
  matric_no           text unique,
  ic_no               text,
  date_of_birth       date,
  birth_state         text,
  gender              text,
  disability          text,
  race                text,
  religion            text,
  nationality         text default 'Warganegara Malaysia',
  marital_status      text,
  parental_income     text,

  -- Contact
  email_personal      text,
  email_official      text,
  phone_home          text,
  phone_mobile        text,

  -- Address
  address_line        text,
  postcode            text,
  city                text,
  state               text,
  hostel_status       text,

  -- Next of kin & parents
  kin_name            text,
  kin_relation        text,
  kin_phone           text,
  father_occupation   text,
  mother_occupation   text,
  dependents_count    int,
  parent_address      text,

  -- Academic
  programme_code      text default 'UR6523007',
  intake_year         text,                 -- '2022', '2025' … selects the curriculum version
  intake_semester     text,                 -- e.g. '2022-S1'
  entry_type          text,
  programme_mode      text default 'Full Time',
  spm_results         jsonb default '{}'::jsonb,
  stpm_results        jsonb default '{}'::jsonb,
  muet_band           text,

  -- Sponsor (name only — no bank account, no bank code, by design)
  sponsor_name        text,

  career_goal         text,
  avatar_path         text,                 -- storage object path, NOT a public URL

  -- PDPA
  consent_version     text,
  consent_at          timestamptz,

  profile_completed   boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.profiles is
  'Student-declared data. Not an official record — AMIS remains the source of truth.';

-- ---------- grade scale (editable; seeded from the RPS Panduan) --------------
create table if not exists public.grade_scale (
  grade       text primary key,
  points      numeric(4,2) not null,
  is_pass     boolean not null default true,
  sort_order  int not null
);

-- ---------- master curriculum ------------------------------------------------
create table if not exists public.curriculum_subjects (
  id                uuid primary key default gen_random_uuid(),
  programme_code    text not null default 'UR6523007',
  intake_year       text not null,             -- curriculum version, e.g. '2025'
  code              text not null,
  name_en           text not null,
  name_ms           text,
  credit            int  not null check (credit >= 0),
  category          subject_category not null,
  planned_semester  int check (planned_semester between 1 and 8),
  -- Industrial Training is graded Pass/Fail, not A–F.
  is_graded         boolean not null default true,
  -- Audit courses carry no credit toward the 140.
  counts_to_total   boolean not null default true,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (programme_code, intake_year, code)
);

-- ---------- what each student has actually taken -----------------------------
create table if not exists public.student_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  subject_id     uuid not null references public.curriculum_subjects (id) on delete cascade,
  attempt_no     int  not null default 1 check (attempt_no between 1 and 6),
  state          record_state not null default 'planned',
  grade          text references public.grade_scale (grade),
  semester_taken text check (semester_taken ~ '^\d{4}-(S1|S2|T)$'),  -- 2024-S1 / 2024-T
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  -- One row per attempt. Without this a student can add the same subject
  -- five times and show 180/140.
  unique (user_id, subject_id, attempt_no)
);

create index if not exists student_records_user_idx on public.student_records (user_id);

-- ---------- Modul 03: Borang Sasaran (target grade planner) ------------------
create table if not exists public.academic_targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  subject_id     uuid not null references public.curriculum_subjects (id) on delete cascade,
  target_grade   text not null references public.grade_scale (grade),
  semester_label text check (semester_label ~ '^\d{4}-(S1|S2|T)$'),
  created_at     timestamptz not null default now(),
  unique (user_id, subject_id)
);

-- ---------- psychometric (Lampiran 1, businessballs MI test) -----------------
create table if not exists public.psychometric_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  attempt_no  int not null default 1,
  -- {"1": 3, "2": 1, ... "70": 4} — kept so an attempt can be re-scored later
  responses   jsonb not null,
  linguistic    int not null,
  logical       int not null,
  musical       int not null,
  kinesthetic   int not null,
  spatial       int not null,
  interpersonal int not null,
  intrapersonal int not null,
  strength      text not null,
  weakness      text not null,
  taken_at    timestamptz not null default now(),
  unique (user_id, attempt_no)
);

-- Lampiran 3: what the student will do about their weakness
create table if not exists public.action_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  weakness    text not null,
  action      text not null,
  created_at  timestamptz not null default now()
);

-- ---------- Borang 1: meeting log -------------------------------------------
create table if not exists public.meetings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  meeting_at    timestamptz not null,
  location      text not null,
  topic         text not null,
  student_notes text,
  rps_notes     text,                       -- only the admin may write/read this
  -- The leaderboard ranks on meetings, so meetings must be confirmable.
  verified      boolean not null default false,
  verified_at   timestamptz,
  created_by    uuid not null references auth.users (id),
  created_at    timestamptz not null default now()
);

create index if not exists meetings_user_idx on public.meetings (user_id, meeting_at desc);

-- ---------- 7 Pillars --------------------------------------------------------
create table if not exists public.pillar_completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  pillar_code   text not null check (pillar_code in ('p1','p2','p3','p4','p5','p6','p7')),
  activity_name text,
  completed_on  date,
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, pillar_code)
);

-- ---------- chatroom ---------------------------------------------------------
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  is_announcement boolean not null default false,
  deleted_at  timestamptz,
  deleted_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

create index if not exists chat_created_idx on public.chat_messages (created_at desc);

-- ---------- audit trail ------------------------------------------------------
create table if not exists public.audit_log (
  id           bigserial primary key,
  actor_id     uuid references auth.users (id),
  action       text not null,
  target_user  uuid references auth.users (id),
  detail       jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- ---------- how many credits each block requires -----------------------------
-- Needed because the elective *options* are all seeded as rows (9 of them) but
-- a student only takes 2. Summing the subject table would overcount, so the
-- requirement is stated explicitly per category.
create table if not exists public.curriculum_requirements (
  programme_code    text not null default 'UR6523007',
  intake_year       text not null,
  category          subject_category not null,
  required_credits  int not null check (required_credits >= 0),
  primary key (programme_code, intake_year, category)
);

-- ---------- psychometric question bank ---------------------------------------
-- The 70 statements live in the database, not in the repo. The instrument is
-- Chislett & Chapman's Multiple Intelligences Test (businessballs.com), free to
-- use but licensed "not to be sold or published" — so a public GitHub repo is
-- the wrong place for it. Seed it with the separate psychometric_items.sql.
create table if not exists public.psychometric_items (
  question_no  int primary key check (question_no between 1 and 200),
  intelligence text not null check (intelligence in
    ('linguistic','logical','musical','kinesthetic','spatial','interpersonal','intrapersonal')),
  text_en      text not null,
  text_ms      text,
  is_active    boolean not null default true
);
