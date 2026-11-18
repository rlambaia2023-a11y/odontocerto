-- Pagamento integral confirmado pelo master/médico (pedido da clínica, 18/11/2026)
--  * alguns pacientes pagam a consulta inteira de uma vez. O responsável (owner) ou o médico (dentista)
--    pode marcar a consulta como "Confirmado" mesmo sem comprovante dos 50%: isso significa que o valor
--    COMPLETO da consulta já foi recebido (paid_full_at);
--  * consulta com pagamento integral não é cancelada automaticamente nem volta para "agendado"
--    quando um comprovante muda; recepção não consegue marcar nem desmarcar.

alter table public.appointments
  add column if not exists paid_full_at timestamptz,
  add column if not exists paid_full_by uuid;

create or replace function public.appt_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare can_full boolean := exists (select 1 from public.clinic_members m
                                     where m.clinic_id = new.clinic_id and m.user_id = auth.uid() and m.role in ('owner', 'dentista'));
begin
  -- só master/médico mexe no pagamento integral
  if tg_op = 'UPDATE' and new.paid_full_at is distinct from old.paid_full_at and not can_full then
    new.paid_full_at := old.paid_full_at; new.paid_full_by := old.paid_full_by;
  elsif tg_op = 'INSERT' and new.paid_full_at is not null and not can_full then
    new.paid_full_at := null; new.paid_full_by := null;
  end if;
  if new.fee is not null and new.fee > 0 and new.status in ('agendado', 'confirmado') then
    -- master/médico escolheu "Confirmado" sem os 50% conferidos: entende-se que pagou o valor completo
    if can_full and new.paid_full_at is null and new.status = 'confirmado'
       and (tg_op = 'INSERT' or old.status is distinct from 'confirmado')
       and not public.appt_paid_half(new.id, new.fee) then
      new.paid_full_at := now();
    end if;
    if new.paid_full_at is null then new.paid_full_by := null;
    elsif tg_op = 'INSERT' or old.paid_full_at is null then new.paid_full_by := auth.uid();
    end if;
    new.status := case when new.paid_full_at is not null or public.appt_paid_half(new.id, new.fee) then 'confirmado' else 'agendado' end;
  end if;
  return new;
end $$;
drop trigger if exists appt_status_guard on public.appointments;
create trigger appt_status_guard before insert or update of status, fee, paid_full_at on public.appointments
  for each row execute function public.appt_status_guard();

create or replace function public.receipt_sync_appt()
returns trigger language plpgsql security definer set search_path = public as $$
declare aid uuid := coalesce(new.appointment_id, old.appointment_id);
begin
  if aid is not null then
    update public.appointments a
       set status = case when public.appt_paid_half(a.id, a.fee) then 'confirmado' else 'agendado' end
     where a.id = aid and a.fee is not null and a.fee > 0 and a.status in ('agendado', 'confirmado') and a.paid_full_at is null;
  end if;
  return null;
exception when others then return null;
end $$;
revoke execute on function public.receipt_sync_appt() from public, anon, authenticated;

create or replace function public.auto_cancel_unpaid_online()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare n integer;
begin
  update public.appointments a
     set status = 'cancelado', auto_cancelled_at = now(),
         notes = coalesce(a.notes || ' · ', '') || 'Cancelada automaticamente: comprovante de pagamento não anexado até 20 min antes da consulta'
   where a.payment_terms_at is not null and a.fee is not null and a.paid_full_at is null
     and a.status in ('agendado', 'confirmado')
     and a.starts_at <= now() + interval '20 minutes'
     and a.starts_at > now() - interval '2 hours'
     and coalesce((select sum(r.amount) from public.payment_receipts r where r.appointment_id = a.id and r.status <> 'recusado'), 0) < a.fee;
  get diagnostics n = row_count;
  return n;
end $function$;
revoke all on function public.auto_cancel_unpaid_online() from public, anon, authenticated;
