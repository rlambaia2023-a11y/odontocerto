-- Sino de avisos: cada usuário marca avisos como lidos e apaga os lidos (vale em todos os aparelhos dele).
create table if not exists public.notif_state (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 3 and 200),
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.notif_state enable row level security;
drop policy if exists own_rw on public.notif_state;
create policy own_rw on public.notif_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.notif_state to authenticated;

-- limpeza: estados com mais de 120 dias não servem mais (o aviso já sumiu)
select cron.unschedule(jobid) from cron.job where jobname = 'pepmh_notif_cleanup';
select cron.schedule('pepmh_notif_cleanup', '17 4 * * *', $$delete from public.notif_state where created_at < now() - interval '120 days'$$);
