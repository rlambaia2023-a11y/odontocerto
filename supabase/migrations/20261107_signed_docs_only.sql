-- Migração 20261107 · signed_docs_only
-- 1. Na área do paciente só aparece documento assinado com certificado ICP-Brasil.
-- 2. O profissional que emitiu pode excluir um documento assinado errado. A exclusão é lógica:
--    o documento sai do prontuário visível, da área do paciente e do link compartilhado, e passa a
--    constar como ANULADO na verificação pública. O registro e o PDF continuam guardados, como pede
--    a guarda de prontuário (Res. CFM 1.821/2007).
-- 3. Link do paciente entrega o PDF assinado (URL temporária do Storage), não um PDF sem assinatura.

alter table public.documents add column if not exists deleted_at timestamptz;
alter table public.documents add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.documents add column if not exists delete_reason text;
alter table public.documents add column if not exists share_file_url text;

-- Documentos liberados sem assinatura voltam a ficar só no prontuário.
update public.documents set released_at = null, released_by = null where released_at is not null and signed_file_path is null;

alter table public.documents drop constraint if exists documents_release_needs_signature;
alter table public.documents add constraint documents_release_needs_signature
  check (released_at is null or (signed_file_path is not null and deleted_at is null));

create or replace function public.documents_signed_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.signed_file_path is not null then
      raise exception 'Documento assinado não é apagado do banco: use Excluir, que anula o documento e tira da área do paciente.' using errcode = 'P0001';
    end if;
    return old;
  end if;

  -- excluir / restaurar (exclusão lógica)
  if new.deleted_at is distinct from old.deleted_at then
    if old.signed_file_path is not null and auth.uid() is not null and auth.uid() is distinct from old.professional_id then
      raise exception 'Só o profissional que emitiu e assinou pode excluir este documento.' using errcode = 'P0001';
    end if;
    if new.deleted_at is not null then
      new.deleted_at := now();
      new.deleted_by := coalesce(auth.uid(), new.deleted_by);
      new.released_at := null; new.released_by := null;
      new.share_token := null; new.share_expires_at := null; new.share_file_url := null;
    else
      new.deleted_by := null; new.delete_reason := null;
      if old.signed_file_path is not null then new.released_at := now(); new.released_by := auth.uid(); end if;
    end if;
  end if;

  if old.signed_file_path is not null then
    if (new.content, new.patient_id, new.clinic_id, new.doc_type, new.rx_type, new.no_date, new.professional_id, new.professional_name, new.created_at, new.content_hash, new.verify_code, new.signed_file_path, new.signed_at, new.signed_by, new.signed_sha256)
       is distinct from
       (old.content, old.patient_id, old.clinic_id, old.doc_type, old.rx_type, old.no_date, old.professional_id, old.professional_name, old.created_at, old.content_hash, old.verify_code, old.signed_file_path, old.signed_at, old.signed_by, old.signed_sha256) then
      raise exception 'Documento já assinado não pode ser alterado. Use "Repetir" para emitir um novo.' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.signed_file_path is not null then
    if auth.uid() is not null and auth.uid() is distinct from old.professional_id then
      raise exception 'Só o profissional que emitiu o documento pode anexar a versão assinada com o certificado dele.' using errcode = 'P0001';
    end if;
    if split_part(new.signed_file_path, '/', 1) <> old.clinic_id::text then
      raise exception 'Caminho do arquivo assinado inválido.' using errcode = 'P0001';
    end if;
    new.signed_at := now();
    new.signed_by := coalesce(auth.uid(), new.signed_by);
  end if;
  return new;
end $$;

-- Paciente: só assinado, liberado e não excluído.
drop policy if exists "patient_read" on public.documents;
create policy "patient_read" on public.documents for select to authenticated
  using (released_at is not null and signed_file_path is not null and deleted_at is null
         and patient_id in (select public.my_patient_ids()));

drop policy if exists "pepmh_signed_patient_read" on storage.objects;
create policy "pepmh_signed_patient_read" on storage.objects for select to authenticated
  using (bucket_id = 'signed-docs' and exists (
    select 1 from public.documents d
    where d.signed_file_path = storage.objects.name
      and d.released_at is not null and d.deleted_at is null
      and d.patient_id in (select public.my_patient_ids())));

-- Link compartilhado: só documento assinado e não excluído; entrega o PDF assinado.
create or replace function public.shared_document(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'doc', jsonb_build_object('id', d.id, 'doc_type', d.doc_type, 'rx_type', d.rx_type, 'created_at', d.created_at,
                              'verify_code', d.verify_code, 'signed', true, 'professional_name', d.professional_name,
                              'file_url', d.share_file_url),
    'patient', jsonb_build_object('name', p.name),
    'prof', (select jsonb_build_object('full_name', m.full_name, 'council', m.council, 'council_number', m.council_number, 'council_uf', m.council_uf, 'specialty', m.specialty, 'profession', m.profession)
             from public.clinic_members m where m.user_id = d.professional_id and m.clinic_id = d.clinic_id),
    'clinic', jsonb_build_object('name', c.name, 'address', c.address, 'city', c.city, 'state', c.state, 'phone', c.phone, 'email', c.email, 'cnpj', c.cnpj, 'logo_url', c.logo_url))
  from public.documents d join public.patients p on p.id = d.patient_id join public.clinics c on c.id = d.clinic_id
  where d.share_token = p_token and length(p_token) >= 24 and (d.share_expires_at is null or d.share_expires_at > now())
    and d.signed_file_path is not null and d.deleted_at is null
$$;

-- Verificação pública mostra quando o documento foi anulado.
create or replace function public.verify_document(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tipo', d.doc_type, 'emitido_em', d.created_at, 'profissional', d.professional_name,
    'conselho', (select coalesce(m.council,'') || '-' || coalesce(m.council_uf,'') || ' ' || coalesce(m.council_number,'') from public.clinic_members m where m.user_id = d.professional_id and m.clinic_id = d.clinic_id),
    'clinica', c.name, 'paciente_iniciais', (select string_agg(left(w,1), '') from regexp_split_to_table(p.name, '\s+') w where w ~ '^[[:alpha:]]' and lower(w) not in ('de','da','do','das','dos','e')),
    'hash', d.content_hash, 'assinado_icp', d.signed_file_path is not null, 'assinado_em', d.signed_at, 'hash_pdf_assinado', d.signed_sha256,
    'anulado_em', d.deleted_at)
  from public.documents d join public.clinics c on c.id = d.clinic_id join public.patients p on p.id = d.patient_id
  where d.verify_code = upper(trim(p_code))
$$;
