-- ============================================================================
--  myRPS — THE FEED
--
--  Adds posts, reactions and comments, so students can shout and everyone
--  (including you) can react and reply.
--
--  Run it ONCE, after MIGRATE_FIXES.sql.
--  Supabase → SQL Editor → New query → paste → Run. Nothing to edit.
--
--  Your existing announcements are carried across automatically.
-- ============================================================================

-- =====================================================================
-- myRPS — 11_feed.sql   (run ELEVENTH)
--
-- The shout feed: students post, everyone reacts and comments, the RPS is in
-- it rather than above it. Text only, by design.
--
-- A post may be tagged with a subject, which is how the help board works
-- without a second tab: "struggling with NMK21103" is a normal post that
-- happens to name a course.
-- =====================================================================

do $$ begin
  create type post_kind as enum ('post', 'help', 'announcement');
exception when duplicate_object then null; end $$;

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        post_kind not null default 'post',
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  -- optional course tag; the help board is a filter, not a separate place
  subject_code text,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  deleted_by  uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_subject_idx on public.posts (subject_code)
  where subject_code is not null;

create table if not exists public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create table if not exists public.post_reactions (
  post_id   uuid not null references public.posts (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  emoji     text not null check (emoji in ('👏', '🔥', '❤️', '💪')),
  created_at timestamptz not null default now(),
  -- one reaction per person per post; picking another replaces it
  primary key (post_id, user_id)
);

-- ---------- counts, without exposing who reacted to a student's post -------
create or replace view public.v_post_stats
with (security_invoker = on) as
select
  p.id as post_id,
  coalesce(jsonb_object_agg(x.emoji, x.n) filter (where x.emoji is not null), '{}'::jsonb) as reactions,
  coalesce((select count(*) from public.post_comments c
             where c.post_id = p.id and c.deleted_at is null), 0) as comment_count
from public.posts p
left join lateral (
  select r.emoji, count(*) as n
  from public.post_reactions r
  where r.post_id = p.id
  group by r.emoji
) x on true
group by p.id;

-- ---------- permissions ------------------------------------------------------
alter table public.posts          enable row level security;
alter table public.post_comments  enable row level security;
alter table public.post_reactions enable row level security;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select
  to authenticated using (public.is_approved() or public.is_admin());

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (public.is_approved() or public.is_admin())
    -- only the RPS may broadcast
    and (kind <> 'announcement' or public.is_admin())
  );

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
-- Removal is a soft delete (deleted_at), so the RPS keeps a moderation trail.

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete
  to authenticated using (public.is_admin());

drop policy if exists comments_select on public.post_comments;
create policy comments_select on public.post_comments for select
  to authenticated using (public.is_approved() or public.is_admin());

drop policy if exists comments_insert on public.post_comments;
create policy comments_insert on public.post_comments for insert
  to authenticated
  with check (user_id = auth.uid() and (public.is_approved() or public.is_admin()));

drop policy if exists comments_update on public.post_comments;
create policy comments_update on public.post_comments for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists comments_delete on public.post_comments;
create policy comments_delete on public.post_comments for delete
  to authenticated using (public.is_admin());

drop policy if exists reactions_select on public.post_reactions;
create policy reactions_select on public.post_reactions for select
  to authenticated using (public.is_approved() or public.is_admin());

drop policy if exists reactions_write on public.post_reactions;
create policy reactions_write on public.post_reactions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (public.is_approved() or public.is_admin()));

revoke all on public.posts, public.post_comments, public.post_reactions from anon;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, update, delete on public.post_reactions to authenticated;
grant select on public.v_post_stats to authenticated;

-- ---------- live updates -----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['posts', 'post_comments', 'post_reactions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- carry the old announcements across -------------------------------
insert into public.posts (id, user_id, kind, body, created_at, deleted_at)
select m.id, m.user_id,
       (case when m.is_announcement then 'announcement' else 'post' end)::post_kind,
       m.body, m.created_at, m.deleted_at
from public.chat_messages m
on conflict (id) do nothing;

-- ============================================================================
--  Result — all three rows should say OK.
-- ============================================================================
select 'posts' as item,
       case when exists (select 1 from information_schema.tables
                          where table_schema='public' and table_name='posts')
            then 'OK' else 'FAILED' end as result
union all
select 'reactions and comments',
       case when (select count(*) from information_schema.tables
                   where table_schema='public'
                     and table_name in ('post_reactions','post_comments')) = 2
            then 'OK' else 'FAILED' end
union all
select 'live updates on',
       case when (select count(*) from pg_publication_tables
                   where pubname='supabase_realtime' and schemaname='public'
                     and tablename in ('posts','post_comments','post_reactions')) = 3
            then 'OK' else 'FAILED' end;
