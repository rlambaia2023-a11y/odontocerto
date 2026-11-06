-- Migração 20261106233000 · document_release_to_patient
-- Documentos (receitas, atestados, pedidos de exame, encaminhamentos, laudos...) passam a
-- aparecer na área do paciente só depois de liberados. A liberação é automática quando o
-- PDF assinado com certificado ICP-Brasil é enviado; a profissional também pode liberar
-- manualmente um documento que não vai assinar digitalmente.

alter table public.documents add column if not exists released_at timestamptz;
alter table public.documents add column if not exists released_by uuid references auth.users(id) on delete set null;

-- O que já existia continua visível para o paciente, como antes desta migração.
update public.documents set released_at = coalesce(signed_at, created_at) where released_at is null;

create index if not exists documents_patient_released_idx on public.documents(patient_id, released_at desc) where released_at is not null;

-- Assinou → libera na hora (vale para qualquer caminho de gravação, não só para a tela).
create or replace function public.release_document_on_sign() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.signed_file_path is not null
     and (tg_op = 'INSERT' or old.signed_file_path is distinct from new.signed_file_path)
     and new.released_at is null then
    new.released_at := coalesce(new.signed_at, now());
    new.released_by := coalesce(new.released_by, new.signed_by, auth.uid());
  end if;
  return new;
end $$;
revoke all on function public.release_document_on_sign() from public;

drop trigger if exists documents_release_on_sign on public.documents;
create trigger documents_release_on_sign before insert or update of signed_file_path on public.documents
  for each row execute function public.release_document_on_sign();

-- Paciente só enxerga documento liberado.
drop policy if exists "patient_read" on public.documents;
create policy "patient_read" on public.documents for select to authenticated
  using (released_at is not null and patient_id in (select public.my_patient_ids()));

-- PDF assinado no Storage: mesma regra, escrita de forma explícita.
drop policy if exists "pepmh_signed_patient_read" on storage.objects;
create policy "pepmh_signed_patient_read" on storage.objects for select to authenticated
  using (bucket_id = 'signed-docs' and exists (
    select 1 from public.documents d
    where d.signed_file_path = storage.objects.name
      and d.released_at is not null
      and d.patient_id in (select public.my_patient_ids())));
