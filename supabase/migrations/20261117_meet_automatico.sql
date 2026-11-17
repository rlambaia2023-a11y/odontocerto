-- Link do Google Meet automático nas consultas online.
-- Consulta online ativa, sem link e com o Google da clínica conectado → meet_status = 'gerando' e uma tarefa
-- upsertEvent vai para a fila. O script da conta da clínica cria o evento com Meet; a ponte só grava o link
-- (meet_status = 'validado') quando o Google confirma a sala. Link colado à mão → meet_status = null.
alter table public.appointments
  add column if not exists meet_status text,
  add column if not exists meet_error text;
alter table public.appointments drop constraint if exists appointments_meet_status_check;
alter table public.appointments add constraint appointments_meet_status_check check (meet_status in ('gerando', 'validado', 'erro'));

create or replace function public.appt_meet_auto()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  -- link trocado à mão (a ponte sempre muda link e status juntos)
  if tg_op = 'UPDATE' and new.meeting_url is distinct from old.meeting_url and new.meet_status is not distinct from old.meet_status then
    new.meet_status := null; new.meet_error := null;
  end if;
  if new.modality = 'online' and new.meeting_url is null
     and coalesce(new.approval, '') not in ('pendente', 'recusado')
     and new.status not in ('cancelado', 'faltou', 'atendido')
     and coalesce(new.meet_status, '') <> 'erro'
     and exists (select 1 from public.clinic_integrations i where i.clinic_id = new.clinic_id and i.gas_secret is not null) then
    new.meet_status := 'gerando'; new.meet_error := null;
  elsif new.meet_status = 'gerando' and (new.modality <> 'online' or new.meeting_url is not null) then
    new.meet_status := null;
  end if;
  return new;
end $$;

create or replace function public.appt_meet_enqueue()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.meet_status = 'gerando' and (tg_op = 'INSERT' or old.meet_status is distinct from 'gerando')
     and not exists (select 1 from public.google_jobs j where j.ref_table = 'appointments' and j.ref_id = new.id
                     and j.kind = 'upsertEvent' and j.status in ('pendente', 'enviado')) then
    -- o conteúdo do evento é montado pela ponte na hora do envio ao script
    insert into public.google_jobs (clinic_id, kind, payload, ref_table, ref_id) values (new.clinic_id, 'upsertEvent', '{}'::jsonb, 'appointments', new.id);
  end if;
  return null;
end $$;

drop trigger if exists zz_meet_auto on public.appointments;
create trigger zz_meet_auto before insert or update of meeting_url, modality, approval, status, meet_status on public.appointments
  for each row execute function public.appt_meet_auto();
drop trigger if exists zz_meet_enqueue on public.appointments;
create trigger zz_meet_enqueue after insert or update on public.appointments
  for each row when (new.meet_status = 'gerando') execute function public.appt_meet_enqueue();

revoke execute on function public.appt_meet_auto() from public, anon, authenticated;
revoke execute on function public.appt_meet_enqueue() from public, anon, authenticated;

-- consultas online futuras já existentes sem link
update public.appointments set meet_status = null
 where modality = 'online' and meeting_url is null and starts_at > now();
