-- Situação da consulta (pedido da clínica, 13/11/2026)
--  * consulta com valor (online, R$ 300): antes de começar fica "confirmado" só quando o comprovante dos 50%
--    já foi CONFIRMADO pela clínica; sem isso fica "agendado" (a tela mostra "Aguardando confirmação de pagamento");
--  * "em_atendimento" (Em andamento) só quando o atendimento é iniciado;
--  * depois de encerrada: "atendido" (Consulta finalizada);
--  * pesquisa de atendimento com 3 perguntas ao final, enviada por e-mail para mh.cuidarsaude@gmail.com.

-- 1) status x pagamento -------------------------------------------------------------------------------
create or replace function public.appt_paid_half(p_appt uuid, p_fee numeric)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select sum(r.amount) from public.payment_receipts r
                    where r.appointment_id = p_appt and r.status = 'confirmado'), 0) >= p_fee / 2 - 0.005;
$$;
revoke all on function public.appt_paid_half(uuid, numeric) from public, anon;

-- vale para qualquer gravação na consulta (aprovação do pedido, edição manual, etc.)
create or replace function public.appt_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.fee is not null and new.fee > 0 and new.status in ('agendado', 'confirmado') then
    new.status := case when public.appt_paid_half(new.id, new.fee) then 'confirmado' else 'agendado' end;
  end if;
  return new;
end $$;
drop trigger if exists appt_status_guard on public.appointments;
create trigger appt_status_guard before insert or update of status, fee on public.appointments
  for each row execute function public.appt_status_guard();

-- quando a clínica confirma/recusa/apaga um comprovante, a consulta acompanha
create or replace function public.receipt_sync_appt()
returns trigger language plpgsql security definer set search_path = public as $$
declare aid uuid := coalesce(new.appointment_id, old.appointment_id);
begin
  if aid is not null then
    update public.appointments a
       set status = case when public.appt_paid_half(a.id, a.fee) then 'confirmado' else 'agendado' end
     where a.id = aid and a.fee is not null and a.fee > 0 and a.status in ('agendado', 'confirmado');
  end if;
  return null;
exception when others then return null;
end $$;
revoke execute on function public.receipt_sync_appt() from public, anon, authenticated;
drop trigger if exists receipt_sync_appt on public.payment_receipts;
create trigger receipt_sync_appt after insert or update or delete on public.payment_receipts
  for each row execute function public.receipt_sync_appt();

-- acerta as consultas futuras que já existem
update public.appointments a
   set status = case when public.appt_paid_half(a.id, a.fee) then 'confirmado' else 'agendado' end
 where a.fee is not null and a.fee > 0 and a.status in ('agendado', 'confirmado');

-- 2) encerramento ---------------------------------------------------------------------------------------
alter table public.appointments add column if not exists finished_at timestamptz;

create or replace function public.appt_finish_stamp()
returns trigger language plpgsql as $$
begin
  if new.status = 'atendido' and old.status is distinct from 'atendido' and new.finished_at is null then new.finished_at := now(); end if;
  return new;
end $$;
drop trigger if exists appt_finish_stamp on public.appointments;
create trigger appt_finish_stamp before update of status on public.appointments
  for each row execute function public.appt_finish_stamp();

-- rede de segurança: atendimento iniciado e esquecido aberto é finalizado 2 h depois do horário de término
create or replace function public.auto_finish_appointments()
returns integer language sql security definer set search_path = public as $$
  with u as (update public.appointments set status = 'atendido'
              where status = 'em_atendimento' and ends_at < now() - interval '2 hours' returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.auto_finish_appointments() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'pepmh_auto_finish';
select cron.schedule('pepmh_auto_finish', '*/10 * * * *', 'select public.auto_finish_appointments()');
select public.auto_finish_appointments();

-- 3) pesquisa de atendimento ----------------------------------------------------------------------------
create table if not exists public.appointment_feedback (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  facilidade text not null check (facilidade in ('sim', 'mais_ou_menos', 'nao')),
  sugestao text check (sugestao is null or char_length(sugestao) <= 1500),
  created_at timestamptz not null default now()
);
alter table public.appointment_feedback enable row level security;
drop policy if exists clinic_read on public.appointment_feedback;
create policy clinic_read on public.appointment_feedback for select using (clinic_id in (select my_clinic_ids()));
drop policy if exists patient_read on public.appointment_feedback;
create policy patient_read on public.appointment_feedback for select using (patient_id in (select my_patient_ids()));
drop policy if exists patient_insert on public.appointment_feedback;
create policy patient_insert on public.appointment_feedback for insert
  with check (patient_id in (select my_patient_ids())
    and exists (select 1 from public.appointments a where a.id = appointment_id and a.patient_id = appointment_feedback.patient_id
                and a.clinic_id = appointment_feedback.clinic_id and a.status = 'atendido'));
grant select, insert on public.appointment_feedback to authenticated;

create or replace function public.notify_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  esc constant text := 'mh.cuidarsaude@gmail.com';
  p public.patients; a public.appointments; pro text; integ public.clinic_integrations;
  fac text; rows text[][]; html text := ''; txt text := ''; i int; e text;
begin
  select * into p from public.patients where id = new.patient_id;
  select * into a from public.appointments where id = new.appointment_id;
  select full_name into pro from public.clinic_members where user_id = a.professional_id and clinic_id = a.clinic_id limit 1;
  select * into integ from public.clinic_integrations where clinic_id = new.clinic_id and gas_secret is not null;
  if integ.clinic_id is null then select * into integ from public.clinic_integrations where lower(account_email) = esc and gas_secret is not null limit 1; end if;
  if integ.clinic_id is null then return new; end if;
  fac := case new.facilidade when 'sim' then 'Sim' when 'mais_ou_menos' then 'Mais ou menos' else 'Não' end;
  rows := array[
    array['Paciente', p.name],
    array['Consulta', to_char(a.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') || ' · ' || coalesce(a.modality, 'presencial') || coalesce(' · ' || pro, '')],
    array['1. Nota para o atendimento (1 a 5)', new.nota || ' de 5 ' || repeat('★', new.nota) || repeat('☆', 5 - new.nota)],
    array['2. Foi fácil marcar, pagar e ser atendido no horário?', fac],
    array['3. O que podemos melhorar?', coalesce(nullif(trim(new.sugestao), ''), '(não escreveu)')],
    array['Respondida em', to_char(new.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')]];
  for i in 1 .. array_length(rows, 1) loop
    e := replace(replace(replace(coalesce(rows[i][2], ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
    html := html || '<tr><td style="padding:6px 14px 6px 0;color:#555;vertical-align:top">' || rows[i][1] || '</td><td style="padding:6px 0"><b>' || e || '</b></td></tr>';
    txt := txt || rows[i][1] || ': ' || coalesce(rows[i][2], '') || E'\n';
  end loop;
  html := '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>Nova resposta da pesquisa de atendimento.</p><table style="border-collapse:collapse">'
       || html || '</table><p style="color:#777;font-size:12px">Mensagem automática do PEPMH</p></div>';
  insert into public.google_jobs (clinic_id, kind, payload)
  values (integ.clinic_id, 'checkin', jsonb_build_object('to', esc, 'subject', 'Pesquisa de atendimento',
    'html', html, 'text', txt, 'name', 'PEPMH'));
  return new;
exception when others then
  return new; -- o e-mail nunca impede a resposta do paciente
end $$;
revoke execute on function public.notify_feedback() from public, anon, authenticated;
drop trigger if exists zz_notify_feedback on public.appointment_feedback;
create trigger zz_notify_feedback after insert on public.appointment_feedback for each row execute function public.notify_feedback();
