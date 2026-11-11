-- Avisos no WhatsApp da MH (+55 75 98108-9146) pelo agente-whatsapp-clinica:
-- comprovante enviado, pagamento confirmado, consulta cancelada e paciente novo.
-- Fila no banco (wa_notices): um cron a cada minuto envia por pg_net e só marca como enviado
-- quando o agente responde 200; se o agente estiver fora do ar, tenta de novo depois.
-- A chave fica no Vault (nome 'wa_avisos_token'), igual à variável AVISOS_TOKEN do agente.

create table if not exists public.wa_notices (
  id bigint generated always as identity primary key,
  clinic_id uuid references public.clinics(id) on delete cascade,
  texto text not null check (char_length(texto) <= 3000),
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'erro')),
  request_id bigint,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists wa_notices_status_idx on public.wa_notices (status, id);
alter table public.wa_notices enable row level security; -- só o servidor usa

create or replace function public._wa(p_clinic uuid, p_texto text)
returns void language sql security definer set search_path = public as $$
  insert into public.wa_notices (clinic_id, texto) values (p_clinic, left(p_texto, 3000));
$$;
revoke all on function public._wa(uuid, text) from public, anon, authenticated;

create or replace function public.wa_send_pending()
returns integer language plpgsql security definer set search_path = public as $$
declare
  url constant text := 'https://agente-whatsapp-clinica-production.up.railway.app/api/avisar';
  tok text; r record; resp record; n int := 0;
begin
  -- confere as respostas dos envios anteriores
  for r in select * from public.wa_notices where status = 'pendente' and request_id is not null loop
    select status_code, error_msg into resp from net._http_response where id = r.request_id;
    if not found then continue; end if; -- ainda sem resposta
    if resp.status_code = 200 then update public.wa_notices set status = 'enviado', sent_at = now() where id = r.id;
    else update public.wa_notices set request_id = null, last_error = coalesce(resp.status_code::text, '') || ' ' || coalesce(resp.error_msg, ''),
           status = case when r.attempts >= 300 then 'erro' else 'pendente' end where id = r.id;
    end if;
  end loop;
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'wa_avisos_token';
  if tok is null then return 0; end if;
  -- envia os pendentes (em ordem, no máximo 20 por minuto)
  for r in select * from public.wa_notices where status = 'pendente' and request_id is null order by id limit 20 loop
    update public.wa_notices set attempts = attempts + 1,
      request_id = net.http_post(url := url, body := jsonb_build_object('texto', r.texto),
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok), timeout_milliseconds := 15000)
    where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.wa_send_pending() from public, anon, authenticated;

-- ---------- gatilhos ----------
create or replace function public.wa_on_receipt()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.patients; a public.appointments; det text;
begin
  select * into p from public.patients where id = new.patient_id;
  if new.appointment_id is not null then select * into a from public.appointments where id = new.appointment_id; end if;
  det := coalesce('R$ ' || replace(to_char(new.amount, 'FM999G990D00'), '.', ','), 'valor não informado')
      || coalesce(E'\nConsulta online de ' || to_char(a.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || ' · ' || new.installment || 'ª parte (50%)', '');
  if tg_op = 'INSERT' then
    perform public._wa(new.clinic_id, 'PEPMH · Comprovante de pagamento enviado' || E'\nPaciente: ' || coalesce(p.name, '—') || E'\n' || det || E'\nConfira em Financeiro.');
  elsif new.status = 'confirmado' and old.status is distinct from 'confirmado' then
    perform public._wa(new.clinic_id, 'PEPMH · Pagamento confirmado' || E'\nPaciente: ' || coalesce(p.name, '—') || E'\n' || det);
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists zz_wa_receipt on public.payment_receipts;
create trigger zz_wa_receipt after insert or update of status on public.payment_receipts for each row execute function public.wa_on_receipt();

create or replace function public.wa_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.patients; motivo text;
begin
  if new.status <> 'cancelado' or old.status = 'cancelado' then return new; end if;
  select * into p from public.patients where id = new.patient_id;
  motivo := case when new.auto_cancelled_at is not null then 'cancelada automaticamente: comprovante de pagamento não anexado até 20 min antes'
                 when coalesce(new.notes, '') like '%Cancelada pelo paciente%' then 'cancelada pelo paciente'
                 when new.approval = 'recusado' then 'pedido recusado pela clínica'
                 else 'cancelada pela clínica' end;
  perform public._wa(new.clinic_id, 'PEPMH · Consulta cancelada' || E'\nPaciente: ' || coalesce(p.name, new.title, '—')
    || E'\nData: ' || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')
    || ' · ' || case when new.modality = 'online' then 'online' else 'presencial' end || E'\nMotivo: ' || motivo);
  return new;
exception when others then return new;
end $$;
drop trigger if exists zz_wa_cancel on public.appointments;
create trigger zz_wa_cancel after update of status on public.appointments for each row execute function public.wa_on_cancel();

-- paciente novo: um aviso por paciente; importação em lote (mais de 5 de uma vez) vira um aviso só
create or replace function public.wa_on_new_patient()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; total int;
begin
  select count(*) into total from novos;
  if total > 5 then
    for r in select clinic_id, count(*) n from novos group by clinic_id loop
      perform public._wa(r.clinic_id, 'PEPMH · ' || r.n || ' pacientes novos importados de uma vez');
    end loop;
    return null;
  end if;
  for r in select * from novos loop
    perform public._wa(r.clinic_id, 'PEPMH · Paciente novo cadastrado' || E'\nNome: ' || coalesce(r.name, '—')
      || coalesce(E'\nCelular: ' || r.phone, '') || E'\nOrigem: ' || coalesce(nullif(r.origin, ''), case when r.user_id is not null then 'cadastro pelo site' else 'cadastro pela equipe' end));
  end loop;
  return null;
exception when others then return null;
end $$;
drop trigger if exists zz_wa_new_patient on public.patients;
create trigger zz_wa_new_patient after insert on public.patients referencing new table as novos for each statement execute function public.wa_on_new_patient();

revoke all on function public.wa_on_receipt(), public.wa_on_cancel(), public.wa_on_new_patient() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'pepmh_wa_send';
select cron.schedule('pepmh_wa_send', '* * * * *', 'select public.wa_send_pending()');
