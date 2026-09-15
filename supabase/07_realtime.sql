-- =====================================================================
-- myRPS — 07_realtime.sql   (run LAST)
-- Turns on live updates for the chatroom. RLS still applies to realtime, so
-- an unapproved account receives nothing.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- Optional but recommended: keep the chatroom from becoming an archive nobody
-- moderates. Deletes messages older than 120 days.
-- Schedule in Supabase → Database → Cron (pg_cron), or just run it by hand.
create or replace function public.purge_old_chat()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.chat_messages where created_at < now() - interval '120 days';
$$;
