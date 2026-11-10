-- Aviso por e-mail para a master (mh.cuidarsaude@gmail.com) a cada conta nova no PEPMH.
-- Vai pela fila google_jobs (tipo 'checkin', só e-mail): o script do Google da clínica envia pelo Gmail.
-- Roda depois de on_auth_user_created (ordem alfabética), então a ficha/clínica já existe.
create or replace function public.notify_new_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  esc constant text := 'mh.cuidarsaude@gmail.com';
  app constant text := 'https://pepmh-web-production.up.railway.app';
  p public.patients; m public.clinic_members; c public.clinics; integ public.clinic_integrations;
  tipo text; link text; nome text; rows text[][]; html text := ''; txt text := ''; i int;
  e text;
begin
  -- acesso criado pela própria master na ficha: ela já sabe, não avisa
  if coalesce(new.raw_user_meta_data->>'created_by_clinic', '') = 'true' then return new; end if;
  select * into p from public.patients where user_id = new.id limit 1;
  select * into m from public.clinic_members where user_id = new.id limit 1;
  select * into c from public.clinics where id = coalesce(p.clinic_id, m.clinic_id);
  nome := coalesce(nullif(trim(p.name), ''), nullif(trim(m.full_name), ''), nullif(trim(new.raw_user_meta_data->>'full_name'), ''), '(sem nome)');
  if p.id is not null then
    tipo := case when coalesce(new.raw_user_meta_data->>'patient_code', '') <> '' then 'Paciente (ligou a conta à ficha existente)'
                 else 'Paciente (cadastro pelo site)' end;
    link := app || '/#/paciente/' || p.id;
  elsif m.user_id is not null then
    tipo := case when m.role = 'owner' then 'Novo consultório (responsável)' else 'Profissional da equipe (' || m.role || ')' end;
    link := app || '/#/';
  else
    tipo := 'Conta sem ficha nem equipe'; link := app || '/#/';
  end if;

  select * into integ from public.clinic_integrations where clinic_id = c.id and gas_secret is not null;
  if integ.clinic_id is null then select * into integ from public.clinic_integrations where lower(account_email) = esc and gas_secret is not null limit 1; end if;
  if integ.clinic_id is null then return new; end if;

  rows := array[
    array['Tipo', tipo], array['Nome', nome], array['E-mail', new.email],
    array['CPF', coalesce(p.cpf, '—')], array['Nascimento', coalesce(to_char(p.birth_date, 'DD/MM/YYYY'), '—')],
    array['Telefone', coalesce(p.phone, '—')], array['Clínica', coalesce(c.name, '—')],
    array['Quando', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')]];
  for i in 1 .. array_length(rows, 1) loop
    e := replace(replace(replace(coalesce(rows[i][2], ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
    html := html || '<tr><td style="padding:4px 12px 4px 0;color:#555">' || rows[i][1] || '</td><td style="padding:4px 0"><b>' || e || '</b></td></tr>';
    txt := txt || rows[i][1] || ': ' || coalesce(rows[i][2], '') || E'\n';
  end loop;
  html := '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111"><p>Novo cadastro no PEPMH.</p><table style="border-collapse:collapse">'
       || html || '</table><p>{{DRIVE}}<a href="' || link || '">Abrir no PEPMH</a></p><p style="color:#777;font-size:12px">Mensagem automática do PEPMH</p></div>';

  insert into public.google_jobs (clinic_id, kind, payload)
  values (integ.clinic_id, 'checkin', jsonb_build_object('to', esc, 'subject', 'Novo cadastro no PEPMH · ' || left(nome, 80),
    'html', html, 'text', txt || link, 'name', 'PEPMH'));
  return new;
exception when others then
  return new; -- o aviso nunca impede o cadastro
end $$;

drop trigger if exists zz_notify_new_signup on auth.users;
create trigger zz_notify_new_signup after insert on auth.users for each row execute function public.notify_new_signup();
revoke execute on function public.notify_new_signup() from public, anon, authenticated;
