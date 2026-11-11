-- Migração 20261111 · assinado_substitui_nao_assinado
-- 1. Guarda a data e a hora que estão DENTRO da assinatura digital (signingTime do certificado) e o
--    nome de quem assinou. O banco recusa assinatura com data anterior à emissão do documento ou no futuro.
-- 2. Quando um documento recebe o PDF assinado, as cópias idênticas que continuavam sem assinatura
--    (mesmo paciente, mesmo tipo, mesmo profissional e mesmo conteúdo) saem do prontuário sozinhas.
--    A exclusão é lógica (vai para "Documentos excluídos" com o motivo), como pede a guarda do prontuário.

alter table public.documents add column if not exists sig_time timestamptz;
alter table public.documents add column if not exists sig_signer text;

create or replace function public.documents_signed_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.signed_file_path is not null then
      raise exception 'Documento assinado não é apagado do banco: use Excluir, que anula o documento e tira da área do paciente.' using errcode = 'P0001';
    end if;
    return old;
  end if;
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
    if (new.content, new.patient_id, new.clinic_id, new.doc_type, new.rx_type, new.no_date, new.professional_id, new.professional_name, new.created_at, new.content_hash, new.verify_code, new.signed_file_path, new.signed_at, new.signed_by, new.signed_sha256, new.sig_time, new.sig_signer)
       is distinct from
       (old.content, old.patient_id, old.clinic_id, old.doc_type, old.rx_type, old.no_date, old.professional_id, old.professional_name, old.created_at, old.content_hash, old.verify_code, old.signed_file_path, old.signed_at, old.signed_by, old.signed_sha256, old.sig_time, old.sig_signer) then
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
    if new.sig_time is not null then
      if new.sig_time < old.created_at - interval '15 minutes' then
        raise exception 'A data da assinatura é anterior à emissão do documento. Assine de novo o PDF gerado agora pelo PEPMH.' using errcode = 'P0001';
      end if;
      if new.sig_time > now() + interval '15 minutes' then
        raise exception 'A data da assinatura está no futuro. Confira a data e a hora do computador e assine de novo.' using errcode = 'P0001';
      end if;
    end if;
    new.signed_at := now();
    new.signed_by := coalesce(auth.uid(), new.signed_by);
  end if;
  return new;
end $$;

-- Assinou → as cópias idênticas sem assinatura saem do prontuário.
create or replace function public.documents_drop_unsigned_twins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.documents u
     set deleted_at = now(),
         delete_reason = 'Substituído pela via assinada digitalmente' || coalesce(' (' || new.verify_code || ')', '')
   where u.id <> new.id
     and u.clinic_id = new.clinic_id
     and u.patient_id = new.patient_id
     and u.doc_type = new.doc_type
     and u.professional_id is not distinct from new.professional_id
     and u.content_hash = new.content_hash
     and u.signed_file_path is null
     and u.deleted_at is null;
  return null;
end $$;
revoke all on function public.documents_drop_unsigned_twins() from public;

drop trigger if exists documents_drop_unsigned_twins on public.documents;
create trigger documents_drop_unsigned_twins after update of signed_file_path on public.documents
  for each row when (old.signed_file_path is null and new.signed_file_path is not null and new.deleted_at is null)
  execute function public.documents_drop_unsigned_twins();

-- Verificação pública mostra também a data/hora gravada na assinatura.
create or replace function public.verify_document(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tipo', d.doc_type, 'emitido_em', d.created_at, 'profissional', d.professional_name,
    'conselho', (select coalesce(m.council,'') || '-' || coalesce(m.council_uf,'') || ' ' || coalesce(m.council_number,'') from public.clinic_members m where m.user_id = d.professional_id and m.clinic_id = d.clinic_id),
    'clinica', c.name, 'paciente_iniciais', (select string_agg(left(w,1), '') from regexp_split_to_table(p.name, '\s+') w where w ~ '^[[:alpha:]]' and lower(w) not in ('de','da','do','das','dos','e')),
    'hash', d.content_hash, 'assinado_icp', d.signed_file_path is not null, 'assinado_em', d.signed_at, 'hash_pdf_assinado', d.signed_sha256,
    'hora_assinatura', d.sig_time,
    'anulado_em', d.deleted_at)
  from public.documents d join public.clinics c on c.id = d.clinic_id join public.patients p on p.id = d.patient_id
  where d.verify_code = upper(trim(p_code))
$$;
