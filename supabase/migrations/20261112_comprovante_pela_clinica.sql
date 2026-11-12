-- Comprovante de pagamento anexado também pela equipe (master, profissional ou recepção), não só pelo paciente.
alter table public.payment_receipts
  add column if not exists sent_by text not null default 'paciente' check (sent_by in ('paciente', 'clinica'));

-- paciente continua só podendo enviar como "paciente"
drop policy if exists patient_insert on public.payment_receipts;
create policy patient_insert on public.payment_receipts for insert
  with check (patient_id in (select my_patient_ids()) and clinic_id in (select my_patient_clinic_ids())
    and status = 'enviado' and sent_by = 'paciente' and reviewed_at is null and reviewed_by is null and response is null
    and split_part(file_path, '/', 1) = clinic_id::text and split_part(file_path, '/', 2) = patient_id::text
    and (appointment_id is null or exists (select 1 from public.appointments a where a.id = appointment_id and a.patient_id = payment_receipts.patient_id)));

-- equipe sobe e apaga arquivos de comprovante na pasta da própria clínica
drop policy if exists receipts_clinic_insert on storage.objects;
create policy receipts_clinic_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] in (select x::text from my_clinic_ids() x));
drop policy if exists receipts_clinic_delete on storage.objects;
create policy receipts_clinic_delete on storage.objects for delete to authenticated
  using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] in (select x::text from my_clinic_ids() x));
