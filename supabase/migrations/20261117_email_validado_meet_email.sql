-- E-mail do paciente validado por código (enviado pelo Gmail da clínica, via script do Google) e
-- e-mail automático com o link do Meet assim que a sala é validada pelo Google.
-- * patients.email_verified_at: só o RPC confirm_email_code preenche; trocar o e-mail zera.
-- * Consulta online marcada pelo paciente exige e-mail validado.
-- * appointments.meet_mail_status: enviando / enviado / sem_email / erro.

alter table public.patients add column if not exists email_verified_at timestamptz;
alter table public.appointments
  add column if not exists meet_mail_status text,
  add column if not exists meet_mail_at timestamptz;
alter table public.appointments drop constraint if exists appointments_meet_mail_status_check;
alter table public.appointments add constraint appointments_meet_mail_status_check check (meet_mail_status in ('enviando', 'enviado', 'sem_email', 'erro'));

create table if not exists private.email_codes (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  sent_count int not null default 0,
  last_sent_at timestamptz not null default now()
);
revoke all on private.email_codes from public, anon, authenticated;
create or replace function private.html_esc(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;') $$;

-- ninguém marca o e-mail como validado na mão; trocar o e-mail exige nova validação
create or replace function public.patient_email_verify_guard()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if coalesce(current_setting('pepmh.email_verify', true), '') <> '1' then
    if tg_op = 'INSERT' then new.email_verified_at := null;
    elsif new.email_verified_at is distinct from old.email_verified_at then new.email_verified_at := old.email_verified_at; end if;
  end if;
  if tg_op = 'UPDATE' and lower(coalesce(new.email, '')) is distinct from lower(coalesce(old.email, '')) then new.email_verified_at := null; end if;
  return new;
end $$;
-- o paciente só altera campos liberados; a validação do e-mail passa apenas pelo RPC confirm_email_code
create or replace function public.protect_patient_self()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n public.patients;
begin
  if auth.uid() is not null and not exists (select 1 from public.clinic_members m where m.clinic_id = old.clinic_id and m.user_id = auth.uid()) then
    n := new; new := old;
    new.phone := n.phone; new.email := n.email; new.zip := n.zip; new.address := n.address; new.city := n.city; new.state := n.state;
    if coalesce(current_setting('pepmh.email_verify', true), '') = '1' then new.email_verified_at := n.email_verified_at; end if;
    if coalesce(trim(old.name),'') = '' and coalesce(trim(n.name),'') <> '' then new.name := trim(n.name); end if;
    if old.birth_date is null and n.birth_date between date '1900-01-01' and current_date then new.birth_date := n.birth_date; end if;
    if old.cpf is null and n.cpf ~ '^\d{11}$' then
      if exists (select 1 from public.patients x where x.clinic_id = old.clinic_id and x.cpf = n.cpf and x.id <> old.id) then
        raise exception 'Este CPF já está em outro cadastro da clínica. Fale com a clínica para conferir.' using errcode = 'P0001';
      end if;
      new.cpf := n.cpf;
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists zz_email_verify_guard on public.patients;
create trigger zz_email_verify_guard before insert or update on public.patients
  for each row execute function public.patient_email_verify_guard();

-- envia o código de 6 dígitos para o e-mail do cadastro do paciente logado
create or replace function public.request_email_code()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare p public.patients; c public.clinics; r private.email_codes; code text; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = 'P0001'; end if;
  select * into p from public.patients where user_id = auth.uid() limit 1;
  if not found then raise exception 'Cadastro de paciente não encontrado.' using errcode = 'P0001'; end if;
  if p.email_verified_at is not null then return jsonb_build_object('verified', true, 'email', p.email); end if;
  if p.email is null or p.email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Cadastre um e-mail válido antes.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.clinic_integrations i where i.clinic_id = p.clinic_id and i.gas_secret is not null) then
    raise exception 'A clínica ainda não ativou o envio de e-mails. Fale com a clínica.' using errcode = 'P0001';
  end if;
  select * into r from private.email_codes where patient_id = p.id;
  if found and r.last_sent_at > now() - interval '60 seconds' then raise exception 'Aguarde 1 minuto para pedir outro código.' using errcode = 'P0001'; end if;
  if found and r.sent_day = today and r.sent_count >= 6 then raise exception 'Limite de códigos de hoje atingido. Tente amanhã ou fale com a clínica.' using errcode = 'P0001'; end if;
  code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into private.email_codes as e (patient_id, email, code_hash, expires_at, attempts, sent_day, sent_count, last_sent_at)
  values (p.id, lower(p.email), encode(extensions.digest(code || ':' || p.id::text, 'sha256'), 'hex'), now() + interval '30 minutes', 0, today, 1, now())
  on conflict (patient_id) do update set email = excluded.email, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
    sent_count = case when e.sent_day = today then e.sent_count + 1 else 1 end, sent_day = today, last_sent_at = now();
  select * into c from public.clinics where id = p.clinic_id;
  -- tipo "checkin" = e-mail simples pelo Gmail da clínica (o script também guarda foto no Drive quando houver)
  insert into public.google_jobs (clinic_id, kind, payload, ref_table, ref_id) values (p.clinic_id, 'checkin', jsonb_build_object(
    'to', lower(p.email), 'name', c.name, 'subject', 'Seu código de confirmação: ' || code,
    'html', '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111"><p>Olá, ' || private.html_esc(split_part(p.name, ' ', 1)) || '!</p><p>Seu código para confirmar o e-mail no ' || private.html_esc(c.name) || ' é:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">' || code || '</p><p>Digite o código na sua área do paciente. Ele vale por 30 minutos.</p><p style="color:#777;font-size:12px">Se não foi você, ignore este e-mail.</p></div>',
    'text', 'Seu código de confirmação: ' || code || ' (vale 30 minutos). Digite na sua área do paciente.'), 'patient_email', p.id);
  return jsonb_build_object('sent', true, 'email', lower(p.email));
end $$;

create or replace function public.confirm_email_code(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare p public.patients; r private.email_codes;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = 'P0001'; end if;
  select * into p from public.patients where user_id = auth.uid() limit 1;
  if not found then raise exception 'Cadastro de paciente não encontrado.' using errcode = 'P0001'; end if;
  if p.email_verified_at is not null then return jsonb_build_object('verified', true); end if;
  select * into r from private.email_codes where patient_id = p.id for update;
  if not found or r.expires_at < now() then raise exception 'Código vencido. Peça um novo.' using errcode = 'P0001'; end if;
  if r.attempts >= 5 then raise exception 'Muitas tentativas. Peça um novo código.' using errcode = 'P0001'; end if;
  if r.email <> lower(coalesce(p.email, '')) then raise exception 'O e-mail do cadastro mudou. Peça um novo código.' using errcode = 'P0001'; end if;
  if r.code_hash <> encode(extensions.digest(regexp_replace(coalesce(p_code, ''), '\D', '', 'g') || ':' || p.id::text, 'sha256'), 'hex') then
    -- sem exception aqui: o contador de tentativas precisa ficar gravado (limite de 5)
    update private.email_codes set attempts = attempts + 1 where patient_id = p.id;
    return jsonb_build_object('verified', false, 'message', 'Código incorreto. Confira e tente de novo.');
  end if;
  perform set_config('pepmh.email_verify', '1', true);
  update public.patients set email_verified_at = now() where id = p.id;
  perform set_config('pepmh.email_verify', '', true);
  delete from private.email_codes where patient_id = p.id;
  return jsonb_build_object('verified', true);
end $$;

revoke execute on function public.request_email_code() from public, anon;
revoke execute on function public.confirm_email_code(text) from public, anon;
grant execute on function public.request_email_code() to authenticated;
grant execute on function public.confirm_email_code(text) to authenticated;
revoke execute on function public.patient_email_verify_guard() from public, anon, authenticated;

-- consulta online marcada pelo paciente: e-mail validado obrigatório (o link do Meet vai por e-mail)
create or replace function public.book_appointment(p_slug text, p_professional uuid, p_start timestamp with time zone, p_modality text, p_reason text, p_consent boolean, p_terms boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if onl and (select email_verified_at from public.patients where id = pid) is null then
    raise exception 'Confirme seu e-mail para marcar consulta online: o link da consulta é enviado para ele.' using errcode = 'P0001';
  end if;
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

-- novos tipos de tarefa na fila do Google: código de confirmação e e-mail do link do Meet
alter table public.google_jobs drop constraint if exists google_jobs_ref_table_check;
alter table public.google_jobs add constraint google_jobs_ref_table_check check (ref_table = any (array['appointments', 'work_events', 'weight_checkins', 'patient_email', 'appointments_mail']));

-- ajustes do linter de segurança
alter function private.html_esc(text) set search_path to 'pg_catalog';
revoke execute on function public.book_appointment(text, uuid, timestamptz, text, text, boolean, boolean) from public, anon;
grant execute on function public.book_appointment(text, uuid, timestamptz, text, text, boolean, boolean) to authenticated;
