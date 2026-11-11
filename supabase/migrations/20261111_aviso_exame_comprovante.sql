-- Aviso por e-mail para a master (mh.cuidarsaude@gmail.com) sempre que o paciente anexa um exame ou um comprovante.
-- Mesmo caminho do aviso de novo cadastro: fila google_jobs (tipo 'checkin'), enviada pelo Gmail da clínica.
create or replace function public.notify_patient_upload()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  esc constant text := 'mh.cuidarsaude@gmail.com';
  app constant text := 'https://pepmh-web-production.up.railway.app';
  p public.patients; integ public.clinic_integrations; a public.appointments;
  tipo text; detalhe text; link text; rows text[][]; html text := ''; txt text := ''; i int; e text;
begin
  select * into p from public.patients where id = new.patient_id;
  -- só avisa quando quem anexou foi o próprio paciente
  if p.user_id is null or p.user_id is distinct from auth.uid() then return new; end if;
  if tg_table_name = 'patient_exams' then
    tipo := 'Exame anexado'; detalhe := new.exam_name || coalesce(' · exame de ' || to_char(new.exam_date, 'DD/MM/YYYY'), '');
    link := app || '/#/paciente/' || p.id || '?tab=exames';
  else
    tipo := 'Comprovante de pagamento anexado';
    if new.appointment_id is not null then select * into a from public.appointments where id = new.appointment_id; end if;
    detalhe := coalesce('R$ ' || replace(to_char(new.amount, 'FM999G990D00'), '.', ','), 'valor não informado')
      || coalesce(' · consulta online de ' || to_char(a.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || ' · ' || new.installment || 'ª parte (50%)', '')
      || coalesce(' · ' || new.note, '');
    link := app || '/#/financeiro';
  end if;

  select * into integ from public.clinic_integrations where clinic_id = p.clinic_id and gas_secret is not null;
  if integ.clinic_id is null then select * into integ from public.clinic_integrations where lower(account_email) = esc and gas_secret is not null limit 1; end if;
  if integ.clinic_id is null then return new; end if;

  rows := array[array['Aviso', tipo], array['Paciente', p.name], array['Detalhe', detalhe],
    array['Telefone', coalesce(p.phone, '—')], array['Quando', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')]];
  for i in 1 .. array_length(rows, 1) loop
    e := replace(replace(replace(coalesce(rows[i][2], ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
    html := html || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || rows[i][1] || '</td><td style="padding:4px 0"><b>' || e || '</b></td></tr>';
    txt := txt || rows[i][1] || ': ' || coalesce(rows[i][2], '') || E'\n';
  end loop;
  html := '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>' || tipo || ' no PEPMH.</p><table style="border-collapse:collapse">'
       || html || '</table><p><a href="' || link || '">Abrir no PEPMH</a></p><p style="color:#777;font-size:12px">Mensagem automática do PEPMH</p></div>';
  insert into public.google_jobs (clinic_id, kind, payload)
  values (integ.clinic_id, 'checkin', jsonb_build_object('to', esc, 'subject', tipo || ' · ' || left(coalesce(p.name, 'paciente'), 80),
    'html', html, 'text', txt || link, 'name', 'PEPMH'));
  return new;
exception when others then
  return new; -- o aviso nunca impede o envio do paciente
end $$;
revoke execute on function public.notify_patient_upload() from public, anon, authenticated;

drop trigger if exists zz_notify_upload on public.patient_exams;
create trigger zz_notify_upload after insert on public.patient_exams for each row execute function public.notify_patient_upload();
drop trigger if exists zz_notify_upload on public.payment_receipts;
create trigger zz_notify_upload after insert on public.payment_receipts for each row execute function public.notify_patient_upload();

-- A pedido da clínica (11/11/2026): consultas online já marcadas e sem comprovante também entram na regra
-- (R$ 300; sem comprovantes, cancela sozinha 20 min antes).
update public.appointments a
   set fee = 300, payment_terms_at = now(),
       notes = coalesce(a.notes || ' · ', '') || 'Regra de pagamento da consulta online aplicada pela clínica em 11/11/2026'
 where a.modality = 'online' and a.fee is null and a.starts_at > now() and a.status in ('agendado', 'confirmado')
   and not exists (select 1 from public.payment_receipts r where r.appointment_id = a.id);

-- Alerta por e-mail ao paciente 1 hora antes da consulta online, se os comprovantes ainda não cobrem o valor.
alter table public.appointments add column if not exists pay_alert_sent_at timestamptz;

create or replace function public.alert_unpaid_online()
returns integer language plpgsql security definer set search_path = public as $$
declare
  app constant text := 'https://pepmh-web-production.up.railway.app';
  r record; integ public.clinic_integrations; pago numeric; falta numeric; quando text; corte text; html text; n int := 0;
begin
  for r in
    select a.*, p.name pname, p.email pemail, c.name cname
      from public.appointments a join public.patients p on p.id = a.patient_id join public.clinics c on c.id = a.clinic_id
     where a.payment_terms_at is not null and a.fee is not null and a.pay_alert_sent_at is null
       and a.status in ('agendado', 'confirmado')
       and a.starts_at <= now() + interval '60 minutes' and a.starts_at > now() + interval '20 minutes'
  loop
    pago := coalesce((select sum(x.amount) from public.payment_receipts x where x.appointment_id = r.id and x.status <> 'recusado'), 0);
    if pago >= r.fee then continue; end if;
    update public.appointments set pay_alert_sent_at = now() where id = r.id;
    if coalesce(r.pemail, '') !~ '@' then continue; end if;
    select * into integ from public.clinic_integrations where clinic_id = r.clinic_id and gas_secret is not null;
    if integ.clinic_id is null then select * into integ from public.clinic_integrations where lower(account_email) = 'mh.cuidarsaude@gmail.com' and gas_secret is not null limit 1; end if;
    if integ.clinic_id is null then continue; end if;
    falta := r.fee - pago;
    quando := to_char(r.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI');
    corte := to_char((r.starts_at - interval '20 minutes') at time zone 'America/Sao_Paulo', 'HH24:MI');
    html := '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">'
      || '<p>Olá, ' || replace(replace(split_part(coalesce(r.pname, ''), ' ', 1), '<', ''), '>', '') || '!</p>'
      || '<p>Sua consulta online na ' || replace(replace(coalesce(r.cname, 'clínica'), '<', ''), '>', '') || ' é hoje, <b>' || quando || '</b>, e ainda não recebemos o comprovante de pagamento completo.</p>'
      || '<p>Falta anexar: <b>R$ ' || replace(to_char(falta, 'FM999G990D00'), '.', ',') || '</b> (valor da consulta: R$ ' || replace(to_char(r.fee, 'FM999G990D00'), '.', ',') || ').</p>'
      || '<p>PIX: <b>75991815612</b> em nome de <b>Dra Mayara Miranda da Silva</b>. Depois de pagar, anexe o comprovante na sua área do paciente, em <b>Minhas consultas</b>.</p>'
      || '<p><b>Atenção:</b> se o comprovante não for anexado até as <b>' || corte || '</b> (20 minutos antes), o sistema cancela a consulta automaticamente.</p>'
      || '<p><a href="' || app || '/#/consultas">Abrir minha área do paciente</a></p>'
      || '<p style="color:#777;font-size:12px">Mensagem automática do PEPMH</p></div>';
    insert into public.google_jobs (clinic_id, kind, payload)
    values (integ.clinic_id, 'checkin', jsonb_build_object('to', r.pemail, 'subject', 'Lembrete: pagamento da sua consulta online de hoje (' || quando || ')',
      'html', html, 'text', 'Sua consulta online é hoje, ' || quando || '. Falta anexar o comprovante de R$ ' || replace(to_char(falta, 'FM999G990D00'), '.', ',')
        || '. PIX 75991815612 (Dra Mayara Miranda da Silva). Sem o comprovante até as ' || corte || ', a consulta é cancelada automaticamente. ' || app || '/#/consultas',
      'name', coalesce(r.cname, 'PEPMH')));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.alert_unpaid_online() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'pepmh_alert_unpaid_online';
select cron.schedule('pepmh_alert_unpaid_online', '* * * * *', 'select public.alert_unpaid_online()');
