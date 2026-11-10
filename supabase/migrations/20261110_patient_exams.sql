-- Exames anexados pelo próprio paciente no portal (PDF ou imagem).
-- Conteúdo clínico: a equipe clínica (responsável e profissionais de saúde) vê; a recepção não.
create table if not exists public.patient_exams (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  exam_name text not null check (char_length(trim(exam_name)) between 2 and 120),
  exam_date date check (exam_date is null or exam_date <= current_date + 1),
  description text check (description is null or char_length(description) <= 1000),
  file_path text not null,
  file_type text not null check (file_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  status text not null default 'novo' check (status in ('novo', 'visto')),
  seen_at timestamptz,
  seen_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists patient_exams_patient_idx on public.patient_exams (patient_id, created_at desc);
create index if not exists patient_exams_clinic_status_idx on public.patient_exams (clinic_id, status);

alter table public.patient_exams enable row level security;

create policy clinic_rw on public.patient_exams for all
  using (clinic_id in (select my_clinical_clinic_ids())) with check (clinic_id in (select my_clinical_clinic_ids()));
create policy patient_read on public.patient_exams for select
  using (patient_id in (select my_patient_ids()));
create policy patient_insert on public.patient_exams for insert
  with check (patient_id in (select my_patient_ids()) and clinic_id in (select my_patient_clinic_ids())
    and status = 'novo' and seen_at is null and seen_by is null
    and split_part(file_path, '/', 1) = clinic_id::text and split_part(file_path, '/', 2) = patient_id::text);
-- paciente pode apagar um envio errado enquanto o profissional ainda não viu
create policy patient_delete on public.patient_exams for delete
  using (patient_id in (select my_patient_ids()) and status = 'novo');

-- arquivos: <clinic_id>/<patient_id>/<id>.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-exams', 'patient-exams', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy exams_patient_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-exams'
    and (storage.foldername(name))[1] in (select x::text from my_patient_clinic_ids() x)
    and (storage.foldername(name))[2] in (select x::text from my_patient_ids() x));
create policy exams_patient_read on storage.objects for select to authenticated
  using (bucket_id = 'patient-exams' and (storage.foldername(name))[2] in (select x::text from my_patient_ids() x));
create policy exams_patient_delete on storage.objects for delete to authenticated
  using (bucket_id = 'patient-exams' and (storage.foldername(name))[2] in (select x::text from my_patient_ids() x));
create policy exams_clinic_read on storage.objects for select to authenticated
  using (bucket_id = 'patient-exams' and (storage.foldername(name))[1] in (select x::text from my_clinical_clinic_ids() x));
create policy exams_clinic_delete on storage.objects for delete to authenticated
  using (bucket_id = 'patient-exams' and (storage.foldername(name))[1] in (select x::text from my_clinical_clinic_ids() x));
