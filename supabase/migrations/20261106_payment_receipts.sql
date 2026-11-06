-- Comprovantes de pagamento anexados pelo paciente no portal (PIX etc.)
create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  finance_entry_id uuid references public.finance_entries(id) on delete set null,
  amount numeric(12,2) check (amount is null or amount > 0),
  paid_on date not null default current_date,
  note text check (char_length(note) <= 500),
  file_path text not null,
  file_type text not null,
  status text not null default 'enviado' check (status in ('enviado', 'confirmado', 'recusado')),
  response text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists payment_receipts_patient_idx on public.payment_receipts (patient_id, created_at desc);
create index if not exists payment_receipts_clinic_status_idx on public.payment_receipts (clinic_id, status);
create index if not exists payment_receipts_finance_idx on public.payment_receipts (finance_entry_id);

alter table public.payment_receipts enable row level security;

-- equipe da clínica (inclui recepção/financeiro): vê e confirma
create policy clinic_rw on public.payment_receipts for all
  using (clinic_id in (select my_clinic_ids())) with check (clinic_id in (select my_clinic_ids()));
-- paciente: vê os próprios e envia novos (sem poder marcar como confirmado)
create policy patient_read on public.payment_receipts for select
  using (patient_id in (select my_patient_ids()));
create policy patient_insert on public.payment_receipts for insert
  with check (patient_id in (select my_patient_ids()) and clinic_id in (select my_patient_clinic_ids())
    and status = 'enviado' and reviewed_at is null and reviewed_by is null and response is null
    and split_part(file_path, '/', 1) = clinic_id::text and split_part(file_path, '/', 2) = patient_id::text);

-- arquivos: <clinic_id>/<patient_id>/<id>.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy receipts_patient_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] in (select x::text from my_patient_clinic_ids() x)
    and (storage.foldername(name))[2] in (select x::text from my_patient_ids() x));
create policy receipts_patient_read on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts' and (storage.foldername(name))[2] in (select x::text from my_patient_ids() x));
create policy receipts_clinic_read on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] in (select x::text from my_clinic_ids() x));
