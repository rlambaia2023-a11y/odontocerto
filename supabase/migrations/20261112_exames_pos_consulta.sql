-- Exames pós-consulta: o médico/dentista anexa arquivos (resultados, laudos, imagens, orientações)
-- na ficha do paciente e ele acessa de onde estiver, na área do paciente.
-- Equipe clínica (responsável e profissionais) anexa, vê e exclui; recepção não vê; paciente só lê os dele.
create table if not exists public.post_consult_exams (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 120),
  exam_date date,
  note text check (note is null or char_length(note) <= 1500),
  file_path text not null,
  file_type text not null check (file_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  viewed_at timestamptz
);
create index if not exists post_consult_exams_patient_idx on public.post_consult_exams (patient_id, created_at desc);

alter table public.post_consult_exams enable row level security;

drop policy if exists clinic_rw on public.post_consult_exams;
create policy clinic_rw on public.post_consult_exams for all
  using (clinic_id in (select my_clinical_clinic_ids()))
  with check (clinic_id in (select my_clinical_clinic_ids())
    and split_part(file_path, '/', 1) = clinic_id::text and split_part(file_path, '/', 2) = patient_id::text);
drop policy if exists patient_read on public.post_consult_exams;
create policy patient_read on public.post_consult_exams for select
  using (patient_id in (select my_patient_ids()));

-- o paciente marca como visto (só isso; não altera mais nada)
create or replace function public.post_consult_seen(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.post_consult_exams set viewed_at = now()
   where id = p_id and viewed_at is null and patient_id in (select my_patient_ids());
$$;
revoke all on function public.post_consult_seen(uuid) from public, anon;
grant execute on function public.post_consult_seen(uuid) to authenticated;

-- arquivos: <clinic_id>/<patient_id>/<id>.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-consult', 'post-consult', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists postc_clinic_insert on storage.objects;
create policy postc_clinic_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'post-consult' and (storage.foldername(name))[1] in (select x::text from my_clinical_clinic_ids() x));
drop policy if exists postc_clinic_read on storage.objects;
create policy postc_clinic_read on storage.objects for select to authenticated
  using (bucket_id = 'post-consult' and (storage.foldername(name))[1] in (select x::text from my_clinical_clinic_ids() x));
drop policy if exists postc_clinic_delete on storage.objects;
create policy postc_clinic_delete on storage.objects for delete to authenticated
  using (bucket_id = 'post-consult' and (storage.foldername(name))[1] in (select x::text from my_clinical_clinic_ids() x));
drop policy if exists postc_patient_read on storage.objects;
create policy postc_patient_read on storage.objects for select to authenticated
  using (bucket_id = 'post-consult' and (storage.foldername(name))[2] in (select x::text from my_patient_ids() x));

-- Aviso por e-mail ao paciente quando a equipe anexa um exame pós-consulta (fila google_jobs, Gmail da clínica).
create or replace function public.notify_post_consult()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  app constant text := 'https://pepmh-web-production.up.railway.app';
  p public.patients; c public.clinics; integ public.clinic_integrations; nome text; html text;
begin
  select * into p from public.patients where id = new.patient_id;
  if coalesce(p.email, '') !~ '@' then return new; end if;
  -- se já houve aviso para este paciente nos últimos 10 min, não repete (vários arquivos de uma vez)
  if exists (select 1 from public.post_consult_exams x where x.patient_id = new.patient_id and x.id <> new.id
             and x.created_at > now() - interval '10 minutes') then return new; end if;
  select * into c from public.clinics where id = p.clinic_id;
  select * into integ from public.clinic_integrations where clinic_id = p.clinic_id and gas_secret is not null;
  if integ.clinic_id is null then select * into integ from public.clinic_integrations where lower(account_email) = 'mh.cuidarsaude@gmail.com' and gas_secret is not null limit 1; end if;
  if integ.clinic_id is null then return new; end if;
  nome := replace(replace(split_part(coalesce(p.name, ''), ' ', 1), '<', ''), '>', '');
  html := '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">'
    || '<p>Olá, ' || nome || '!</p>'
    || '<p>A equipe da ' || replace(replace(coalesce(c.name, 'clínica'), '<', ''), '>', '') || ' anexou um arquivo para você em <b>Exames pós-consulta</b>: <b>'
    || replace(replace(new.title, '<', ''), '>', '') || '</b>.</p>'
    || '<p>Você pode abrir pelo celular ou computador, de onde estiver, entrando na sua área do paciente.</p>'
    || '<p><a href="' || app || '/#/pos-consulta">Abrir meus exames pós-consulta</a></p>'
    || '<p style="color:#777;font-size:12px">Mensagem automática do PEPMH</p></div>';
  insert into public.google_jobs (clinic_id, kind, payload)
  values (integ.clinic_id, 'checkin', jsonb_build_object('to', p.email, 'subject', 'Novo arquivo na sua área do paciente: ' || left(new.title, 80),
    'html', html, 'text', 'Olá, ' || nome || '! A clínica anexou "' || new.title || '" em Exames pós-consulta. Acesse: ' || app || '/#/pos-consulta',
    'name', coalesce(c.name, 'PEPMH')));
  return new;
exception when others then
  return new; -- o aviso nunca impede o anexo
end $$;
revoke execute on function public.notify_post_consult() from public, anon, authenticated;

drop trigger if exists zz_notify_post_consult on public.post_consult_exams;
create trigger zz_notify_post_consult after insert on public.post_consult_exams for each row execute function public.notify_post_consult();
