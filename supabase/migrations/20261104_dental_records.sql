-- Registros odontológicos estruturados: periograma, exame clínico e registro de anestesia.
-- Aplicar no projeto Supabase "pepmh" (SQL editor ou `supabase db push`).
create table if not exists public.dental_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  kind text not null check (kind in ('periograma','exame_clinico','anestesia')),
  data jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  professional_name text,
  created_at timestamptz not null default now()
);
create index if not exists dental_records_patient_kind_idx on public.dental_records(patient_id, kind, created_at desc);
create index if not exists dental_records_clinic_idx on public.dental_records(clinic_id);
alter table public.dental_records enable row level security;
-- Só profissionais clínicos (responsável e profissional de saúde) leem e gravam; secretária e paciente não.
drop policy if exists "clinic_rw" on public.dental_records;
create policy "clinic_rw" on public.dental_records as permissive for all to authenticated
  using (clinic_id in (select public.my_clinical_clinic_ids()))
  with check (clinic_id in (select public.my_clinical_clinic_ids()));
grant select, insert, update, delete on public.dental_records to authenticated;
