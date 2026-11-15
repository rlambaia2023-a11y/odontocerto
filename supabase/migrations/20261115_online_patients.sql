-- Pacientes online: sala de espera virtual + visão consolidada dos pacientes atendidos por teleconsulta.
-- Aplicar no projeto Supabase "pepmh" (SQL editor ou `supabase db push`).

-- 1) Sala de espera: o paciente avisa que entrou; a equipe vê quem está aguardando.
alter table public.appointments add column if not exists waiting_since timestamptz;
alter table public.appointments add column if not exists started_at timestamptz;

create index if not exists appointments_online_idx
  on public.appointments (clinic_id, starts_at desc) where modality = 'online';

-- Marca o início real do atendimento e limpa a sala de espera quando a consulta começa ou termina.
create or replace function public.appt_online_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'em_atendimento' and old.status is distinct from 'em_atendimento' then
    new.started_at := coalesce(new.started_at, now());
  end if;
  if new.status in ('em_atendimento', 'atendido', 'cancelado', 'faltou') then
    new.waiting_since := null;
  end if;
  return new;
end $$;
drop trigger if exists appt_online_stamp on public.appointments;
create trigger appt_online_stamp before update of status on public.appointments
  for each row execute function public.appt_online_stamp();

-- Paciente entra na sala de espera (30 min antes até o fim do horário).
create or replace function public.online_enter_waiting(p_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro' using errcode = 'P0001'; end if;
  update public.appointments set waiting_since = coalesce(waiting_since, now())
   where id = p_id
     and patient_id in (select public.my_patient_ids())
     and modality = 'online'
     and status in ('agendado', 'confirmado')
     and coalesce(approval, 'aprovado') <> 'pendente'
     and tele_consent_at is not null
     and now() between starts_at - interval '30 minutes' and ends_at
  returning waiting_since into t;
  if t is null then
    raise exception 'A sala de espera abre 30 minutos antes da consulta online (com o termo aceito).' using errcode = 'P0001';
  end if;
  return t;
end $$;
revoke all on function public.online_enter_waiting(uuid) from public, anon;
grant execute on function public.online_enter_waiting(uuid) to authenticated;

-- 2) Visão "pacientes online": um registro por paciente que já teve/tem/terá consulta online.
--    security_invoker = RLS de appointments/patients vale para quem consulta.
create or replace view public.online_patients with (security_invoker = true) as
select
  p.clinic_id,
  p.id as patient_id,
  p.name,
  p.phone,
  p.email,
  p.user_id is not null as has_portal,
  case
    when count(*) filter (where a.status = 'em_atendimento') > 0 then 'em_atendimento'
    when count(*) filter (where a.waiting_since is not null and a.status in ('agendado','confirmado')) > 0 then 'aguardando'
    when count(*) filter (where a.status in ('agendado','confirmado') and a.ends_at >= now()) > 0 then 'agendado'
    when count(*) filter (where a.status = 'atendido') > 0 then 'atendido'
    else 'inativo'
  end as situacao,
  count(*) filter (where a.status = 'em_atendimento')                                       as em_atendimento,
  count(*) filter (where a.status in ('agendado','confirmado') and a.ends_at >= now())       as agendadas,
  count(*) filter (where a.status = 'atendido')                                             as atendidas,
  count(*) filter (where a.status = 'faltou')                                               as faltas,
  count(*) filter (where a.status = 'cancelado')                                            as canceladas,
  min(a.starts_at) filter (where a.status in ('agendado','confirmado') and a.ends_at >= now()) as proxima_em,
  max(a.starts_at) filter (where a.status = 'atendido')                                     as ultima_atendida_em,
  max(a.waiting_since) filter (where a.status in ('agendado','confirmado'))                  as aguardando_desde,
  min(a.starts_at)                                                                          as primeira_online_em
from public.patients p
join public.appointments a on a.patient_id = p.id and a.modality = 'online'
group by p.clinic_id, p.id, p.name, p.phone, p.email, p.user_id;

grant select on public.online_patients to authenticated;
