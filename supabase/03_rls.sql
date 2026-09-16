-- =====================================================================
-- myRPS — 03_rls.sql   (run THIRD)
--
-- READ THIS FIRST. The site is a static page on GitHub Pages, so the anon
-- key is inside the JavaScript bundle and anyone can read it. That is normal
-- and safe ONLY because of the policies below: they are the whole security
-- model. Anything not protected here is public to anyone who opens devtools.
-- =====================================================================

alter table public.admins              enable row level security;
alter table public.app_settings        enable row level security;
alter table public.profiles            enable row level security;
alter table public.grade_scale         enable row level security;
alter table public.curriculum_subjects enable row level security;
alter table public.curriculum_requirements enable row level security;
alter table public.student_records     enable row level security;
alter table public.academic_targets    enable row level security;
alter table public.psychometric_attempts enable row level security;
alter table public.action_plans        enable row level security;
alter table public.meetings            enable row level security;
alter table public.pillar_completions  enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.audit_log           enable row level security;

-- ---------- admins: readable by nobody, writable by nobody -------------------
-- Membership is managed in the Supabase dashboard only. is_admin() reads it
-- with security definer, so no policy is needed for the app to work.
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select
  using (public.is_admin());

-- ---------- settings ---------------------------------------------------------
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select
  to authenticated using (true);

drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles: your own row, or everything if you are the RPS ---------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select
  to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- INSERT is handled by the handle_new_user trigger; students never insert.
drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles for delete
  to authenticated using (public.is_admin());

-- ---------- reference data: readable by any signed-in user ------------------
drop policy if exists grades_read on public.grade_scale;
create policy grades_read on public.grade_scale for select
  to authenticated using (true);

drop policy if exists grades_write on public.grade_scale;
create policy grades_write on public.grade_scale for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists subjects_read on public.curriculum_subjects;
create policy subjects_read on public.curriculum_subjects for select
  to authenticated using (true);

drop policy if exists subjects_write on public.curriculum_subjects;
create policy subjects_write on public.curriculum_subjects for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Credit requirements drive every progress bar in the app. Readable by all,
-- writable only by the RPS — otherwise a student could set their own
-- graduation target to 6 credits.
drop policy if exists requirements_read on public.curriculum_requirements;
create policy requirements_read on public.curriculum_requirements for select
  to authenticated using (true);

drop policy if exists requirements_write on public.curriculum_requirements;
create policy requirements_write on public.curriculum_requirements for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- academic records: private to the student and the RPS ------------
drop policy if exists records_rw on public.student_records;
create policy records_rw on public.student_records for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

drop policy if exists targets_rw on public.academic_targets;
create policy targets_rw on public.academic_targets for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

-- ---------- psychometric: insert-only for students, never editable ----------
drop policy if exists psych_select on public.psychometric_attempts;
create policy psych_select on public.psychometric_attempts for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists psych_insert on public.psychometric_attempts;
create policy psych_insert on public.psychometric_attempts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_approved()
    and public.can_take_psychometric()      -- the one-attempt lock, enforced here
  );
-- No UPDATE and no DELETE policy: a submitted attempt is immutable. Only the
-- RPS can unlock a retake, via admin_reset_psychometric().

drop policy if exists plans_rw on public.action_plans;
create policy plans_rw on public.action_plans for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

-- ---------- meetings ---------------------------------------------------------
drop policy if exists meetings_select on public.meetings;
create policy meetings_select on public.meetings for select
  to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists meetings_insert on public.meetings;
create policy meetings_insert on public.meetings for insert
  to authenticated
  with check (
    ((user_id = auth.uid() and public.is_approved()) or public.is_admin())
    and created_by = auth.uid()
  );

drop policy if exists meetings_update on public.meetings;
create policy meetings_update on public.meetings for update
  to authenticated
  using ((user_id = auth.uid() and not verified) or public.is_admin())
  with check ((user_id = auth.uid() and not verified) or public.is_admin());
-- A student may correct a meeting until the RPS verifies it, then it is frozen.

drop policy if exists meetings_delete on public.meetings;
create policy meetings_delete on public.meetings for delete
  to authenticated using ((user_id = auth.uid() and not verified) or public.is_admin());

-- ---------- pillars ----------------------------------------------------------
drop policy if exists pillars_rw on public.pillar_completions;
create policy pillars_rw on public.pillar_completions for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

-- ---------- chat: approved students only ------------------------------------
drop policy if exists chat_select on public.chat_messages;
create policy chat_select on public.chat_messages for select
  to authenticated using (public.is_approved() or public.is_admin());

drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (public.is_approved() or public.is_admin())
    and (not is_announcement or public.is_admin())   -- only the RPS may broadcast
  );

drop policy if exists chat_update on public.chat_messages;
create policy chat_update on public.chat_messages for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
-- Deletion is a soft delete (set deleted_at) so the RPS keeps a moderation trail.

drop policy if exists chat_delete on public.chat_messages;
create policy chat_delete on public.chat_messages for delete
  to authenticated using (public.is_admin());

-- ---------- audit log: admin reads, nobody writes directly ------------------
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select
  to authenticated using (public.is_admin());
-- Writes happen inside security-definer functions, which bypass RLS.

-- ---------- psychometric question bank --------------------------------------
alter table public.psychometric_items enable row level security;

drop policy if exists items_read on public.psychometric_items;
create policy items_read on public.psychometric_items for select
  to authenticated using (public.is_approved() or public.is_admin());
-- Signed-in and approved only. Not readable by anon, so the instrument is not
-- served to the open internet.

drop policy if exists items_write on public.psychometric_items;
create policy items_write on public.psychometric_items for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- table privileges -------------------------------------------------
-- Supabase grants new public tables to anon and authenticated automatically via
-- default privileges. Rather than depend on that, state it explicitly and drop
-- anon entirely: nothing in myRPS is meant to be readable while signed out, so
-- the logged-out role should not hold a grant on any of it. RLS is still the
-- rule that decides WHICH rows a signed-in user sees; this decides who may
-- reach the tables at all.
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('revoke all on public.%I from anon', t.tablename);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t.tablename);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Future tables added by the RPS through the dashboard inherit the same shape.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  revoke all on tables from anon;
