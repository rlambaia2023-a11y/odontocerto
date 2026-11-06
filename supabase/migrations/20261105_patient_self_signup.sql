-- Cadastro completo do paciente pelo próprio paciente (sem código da clínica).
-- A conta só funciona depois que o paciente confirma o e-mail (validação mantida no Supabase Auth).
create or replace function public._self_patient(p_uid uuid, p_clinic uuid)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare pid uuid; u auth.users; m jsonb; v_cpf text; v_bd date; v_sex text; v_state text; dup boolean := false;
begin
  select id into pid from public.patients where user_id = p_uid;
  if pid is not null then
    if not exists (select 1 from public.patients where id = pid and clinic_id = p_clinic) then raise exception 'Sua conta de paciente já está ligada a outra clínica.' using errcode = 'P0001'; end if;
    return pid;
  end if;
  select * into u from auth.users where id = p_uid;
  m := coalesce(u.raw_user_meta_data, '{}'::jsonb);
  v_cpf := nullif(regexp_replace(coalesce(m->>'cpf',''), '\D', '', 'g'), '');
  if v_cpf is not null and length(v_cpf) <> 11 then v_cpf := null; end if;
  v_bd := case when (m->>'birth_date') ~ '^\d{4}-\d{2}-\d{2}$' then (m->>'birth_date')::date end;
  v_sex := case when m->>'sex' in ('F','M','O') then m->>'sex' end;
  v_state := nullif(upper(left(trim(coalesce(m->>'state','')), 2)), '');

  -- Paciente que já estava na base (importado ou cadastrado pela clínica) com o mesmo e-mail:
  -- liga a conta a ele e completa só o que estava em branco. Como o login exige confirmar
  -- esse e-mail, só o dono do e-mail consegue usar a ficha.
  if (select count(*) from public.patients where clinic_id = p_clinic and user_id is null and lower(email) = lower(u.email)) = 1 then
    update public.patients p set user_id = p_uid, portal_code = null,
      name = coalesce(nullif(p.name,''), nullif(m->>'full_name','')),
      phone = coalesce(p.phone, nullif(regexp_replace(coalesce(m->>'phone',''), '\D', '', 'g'), '')),
      birth_date = coalesce(p.birth_date, v_bd), cpf = coalesce(p.cpf, v_cpf), sex = coalesce(p.sex, v_sex),
      rg = coalesce(p.rg, nullif(trim(m->>'rg'),'')),
      zip = coalesce(p.zip, nullif(regexp_replace(coalesce(m->>'zip',''), '\D', '', 'g'), '')),
      address = coalesce(p.address, nullif(trim(m->>'address'),'')), city = coalesce(p.city, nullif(trim(m->>'city'),'')), state = coalesce(p.state, v_state),
      occupation = coalesce(p.occupation, nullif(trim(m->>'occupation'),'')), guardian_name = coalesce(p.guardian_name, nullif(trim(m->>'guardian_name'),'')),
      insurance_card = coalesce(p.insurance_card, nullif(trim(m->>'insurance'),'')),
      alerts = case when nullif(trim(m->>'alerts'),'') is null then p.alerts
                    when p.alerts is null then trim(m->>'alerts')
                    else p.alerts || ' | Informado pelo paciente: ' || trim(m->>'alerts') end
    where clinic_id = p_clinic and user_id is null and lower(email) = lower(u.email)
    returning id into pid;
    return pid;
  end if;

  -- CPF igual a outro cadastro: não liga sozinho (daria para tomar a ficha de outra pessoa).
  -- Cria a ficha nova marcada para a clínica conferir.
  if v_cpf is not null and exists (select 1 from public.patients where clinic_id = p_clinic and cpf = v_cpf) then dup := true; end if;

  insert into public.patients(clinic_id, user_id, name, phone, email, birth_date, cpf, sex, rg, zip, address, city, state,
                              occupation, guardian_name, insurance_card, alerts, origin, tags, notes)
  values (p_clinic, p_uid, coalesce(nullif(trim(m->>'full_name'),''), split_part(u.email,'@',1)),
          nullif(regexp_replace(coalesce(m->>'phone',''), '\D', '', 'g'), ''), u.email, v_bd, v_cpf, v_sex,
          nullif(trim(m->>'rg'),''), nullif(regexp_replace(coalesce(m->>'zip',''), '\D', '', 'g'), ''),
          nullif(trim(m->>'address'),''), nullif(trim(m->>'city'),''), v_state,
          nullif(trim(m->>'occupation'),''), nullif(trim(m->>'guardian_name'),''), nullif(trim(m->>'insurance'),''), nullif(trim(m->>'alerts'),''),
          coalesce(nullif(trim(m->>'origin'),''), case when m->>'signup_via' = 'cadastro' then 'Cadastro online' else 'Agendamento online' end),
          case when dup then array['Cadastro online','Possível duplicado'] else array['Cadastro online'] end,
          case when dup then 'O CPF informado já existe em outro cadastro desta clínica. Confira e junte as fichas, se for a mesma pessoa.' end)
  returning id into pid;
  return pid;
end $function$;

-- Clínicas que aceitam pacientes novos (para quem cria a conta pela tela inicial, sem link de clínica).
create or replace function public.public_clinic_list()
returns table(slug text, name text, city text, state text)
language sql stable security definer set search_path to 'public' as $$
  select c.slug, c.name, c.city, c.state from public.clinics c where c.public_booking and c.slug is not null order by c.name
$$;
grant execute on function public.public_clinic_list() to anon, authenticated;
