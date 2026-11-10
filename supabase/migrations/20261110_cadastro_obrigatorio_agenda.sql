-- Agenda só libera para paciente com nome, CPF, data de nascimento e e-mail na ficha (a senha é a da conta).
create or replace function public._profile_missing(p_id uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select nullif(concat_ws(', ',
    case when coalesce(trim(name),'') = '' then 'nome completo' end,
    case when cpf is null then 'CPF' end,
    case when birth_date is null then 'data de nascimento' end,
    case when email is null then 'e-mail' end), '')
  from public.patients where id = p_id
$$;
revoke execute on function public._profile_missing(uuid) from public, anon;

-- Paciente pode preencher (só se estiver vazio) nome, CPF e nascimento; o resto continua igual.
create or replace function public.protect_patient_self()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare n public.patients;
begin
  if auth.uid() is not null and not exists (select 1 from public.clinic_members m where m.clinic_id = old.clinic_id and m.user_id = auth.uid()) then
    n := new; new := old;
    new.phone := n.phone; new.email := n.email; new.zip := n.zip; new.address := n.address; new.city := n.city; new.state := n.state;
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

-- Pedido de consulta feito pelo paciente: exige cadastro completo.
create or replace function public.check_request_profile()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare falta text;
begin
  if auth.uid() is not null and not exists (select 1 from public.clinic_members m where m.clinic_id = new.clinic_id and m.user_id = auth.uid()) then
    falta := public._profile_missing(new.patient_id);
    if falta is not null then raise exception 'Complete seu cadastro para liberar a agenda. Falta: %.', falta using errcode = 'P0001'; end if;
  end if;
  return new;
end $function$;
drop trigger if exists trg_request_profile on public.appointment_requests;
create trigger trg_request_profile before insert on public.appointment_requests for each row execute function public.check_request_profile();

-- Agendamento online: mesma exigência (resto da função igual à versão anterior).
create or replace function public.book_appointment(p_slug text, p_professional uuid, p_start timestamp with time zone, p_modality text, p_reason text, p_consent boolean)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare c public.clinics; m public.clinic_members; pid uuid; aid uuid; pend boolean; falta text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para agendar.' using errcode = 'P0001'; end if;
  select * into c from public.clinics where slug = lower(trim(p_slug)) and public_booking;
  if not found then raise exception 'Agendamento online indisponível para esta clínica.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.clinic_members where clinic_id = c.id and user_id = auth.uid()) then raise exception 'Profissionais da clínica agendam pela agenda interna.' using errcode = 'P0001'; end if;
  select * into m from public.clinic_members where clinic_id = c.id and user_id = p_professional and role in ('owner','dentista');
  if not found then raise exception 'Profissional não encontrado.' using errcode = 'P0001'; end if;
  if p_modality = 'online' and not coalesce(p_consent, false) then raise exception 'Para a consulta online é preciso aceitar o termo de consentimento.' using errcode = 'P0001'; end if;
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
  insert into public.appointments(clinic_id, patient_id, professional_id, starts_at, ends_at, status, kind, modality, meeting_url, tele_consent_at, booked_by_patient, reason, approval)
  values (c.id, pid, m.user_id, p_start, p_start + make_interval(mins => m.slot_min), 'agendado', case when p_modality = 'online' then 'teleconsulta' else 'consulta' end,
          p_modality, case when p_modality = 'online' and not pend then m.meet_url end, case when p_modality = 'online' then now() end, true, nullif(trim(p_reason),''),
          case when pend then 'pendente' end)
  returning id into aid;
  return jsonb_build_object('appointment_id', aid, 'patient_id', pid, 'pending', pend, 'meeting_url', (select meeting_url from public.appointments where id = aid));
end $function$;
