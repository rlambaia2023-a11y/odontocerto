-- Consulta online: aceite das condições de pagamento no agendamento e cancelamento automático.
-- Regras: consulta online custa R$ 300,00; 50% (R$ 150) até 24 h antes e 50% até 30 min antes,
-- com comprovante anexado na área do paciente. Sem os comprovantes, o sistema cancela sozinho 20 min antes.
-- Só vale para consultas marcadas com o aceite (payment_terms_at preenchido); consultas antigas não são tocadas.

alter table public.appointments
  add column if not exists fee numeric(12,2) check (fee is null or fee > 0),
  add column if not exists payment_terms_at timestamptz,
  add column if not exists auto_cancelled_at timestamptz;

alter table public.payment_receipts
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists installment smallint check (installment is null or installment in (1, 2));
create index if not exists payment_receipts_appt_idx on public.payment_receipts (appointment_id);

-- paciente só liga o comprovante a uma consulta dele
drop policy if exists patient_insert on public.payment_receipts;
create policy patient_insert on public.payment_receipts for insert
  with check (patient_id in (select my_patient_ids()) and clinic_id in (select my_patient_clinic_ids())
    and status = 'enviado' and reviewed_at is null and reviewed_by is null and response is null
    and split_part(file_path, '/', 1) = clinic_id::text and split_part(file_path, '/', 2) = patient_id::text
    and (appointment_id is null or exists (select 1 from public.appointments a where a.id = appointment_id and a.patient_id = payment_receipts.patient_id)));

-- agendamento público: novo parâmetro p_terms (aceite das condições de pagamento da consulta online)
drop function if exists public.book_appointment(text, uuid, timestamptz, text, text, boolean);
create or replace function public.book_appointment(p_slug text, p_professional uuid, p_start timestamptz, p_modality text, p_reason text, p_consent boolean, p_terms boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare c public.clinics; m public.clinic_members; pid uuid; aid uuid; pend boolean; falta text; onl boolean := p_modality = 'online';
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para agendar.' using errcode = 'P0001'; end if;
  select * into c from public.clinics where slug = lower(trim(p_slug)) and public_booking;
  if not found then raise exception 'Agendamento online indisponível para esta clínica.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.clinic_members where clinic_id = c.id and user_id = auth.uid()) then raise exception 'Profissionais da clínica agendam pela agenda interna.' using errcode = 'P0001'; end if;
  select * into m from public.clinic_members where clinic_id = c.id and user_id = p_professional and role in ('owner','dentista');
  if not found then raise exception 'Profissional não encontrado.' using errcode = 'P0001'; end if;
  if onl and not coalesce(p_consent, false) then raise exception 'Para a consulta online é preciso aceitar o termo de consentimento.' using errcode = 'P0001'; end if;
  if onl and not coalesce(p_terms, false) then raise exception 'Para a consulta online é preciso aceitar as condições de pagamento.' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext(p_professional::text));
  if not exists (select 1 from public.public_slots(p_slug, p_professional, (p_start at time zone 'America/Sao_Paulo')::date, 1) s where s.starts_at = p_start and s.modality = p_modality) then
    raise exception 'Esse horário acabou de ser ocupado ou não está disponível. Escolha outro.' using errcode = 'P0001';
  end if;
  pid := public._self_patient(auth.uid(), c.id);
  falta := public._profile_missing(pid);
  if falta is not null then raise exception 'Complete seu cadastro para liberar a agenda. Falta: %.', falta using errcode = 'P0001'; end if;
  if (select count(*) from public.appointments where patient_id = pid and booked_by_patient and starts_at > now() and status not in ('cancelado','faltou')) >= 3 then
    raise exception 'Você já tem 3 consultas futuras marcadas. Cancele uma para marcar outra.' using errcode = 'P0001';
  end if;
  pend := c.booking_requires_approval;
  insert into public.appointments(clinic_id, patient_id, professional_id, starts_at, ends_at, status, kind, modality, meeting_url, tele_consent_at, booked_by_patient, reason, approval, fee, payment_terms_at)
  values (c.id, pid, m.user_id, p_start, p_start + make_interval(mins => m.slot_min), 'agendado', case when onl then 'teleconsulta' else 'consulta' end,
          p_modality, case when onl and not pend then m.meet_url end, case when onl then now() end, true, nullif(trim(p_reason),''),
          case when pend then 'pendente' end, case when onl then 300 end, case when onl then now() end)
  returning id into aid;
  return jsonb_build_object('appointment_id', aid, 'patient_id', pid, 'pending', pend, 'fee', case when onl then 300 end,
    'meeting_url', (select meeting_url from public.appointments where id = aid));
end $function$;
grant execute on function public.book_appointment(text, uuid, timestamptz, text, text, boolean, boolean) to authenticated;

-- cancelamento automático: 20 min antes, se os comprovantes enviados não cobrem o valor da consulta
create or replace function public.auto_cancel_unpaid_online()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare n integer;
begin
  update public.appointments a
     set status = 'cancelado', auto_cancelled_at = now(),
         notes = coalesce(a.notes || ' · ', '') || 'Cancelada automaticamente: comprovante de pagamento não anexado até 20 min antes da consulta'
   where a.payment_terms_at is not null and a.fee is not null
     and a.status in ('agendado', 'confirmado')
     and a.starts_at <= now() + interval '20 minutes'
     and a.starts_at > now() - interval '2 hours'
     and coalesce((select sum(r.amount) from public.payment_receipts r where r.appointment_id = a.id and r.status <> 'recusado'), 0) < a.fee;
  get diagnostics n = row_count;
  return n;
end $function$;
revoke all on function public.auto_cancel_unpaid_online() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'pepmh_auto_cancel_online';
select cron.schedule('pepmh_auto_cancel_online', '* * * * *', 'select public.auto_cancel_unpaid_online()');
