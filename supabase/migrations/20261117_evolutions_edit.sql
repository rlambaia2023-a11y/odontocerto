-- Evoluções editáveis com histórico preservado (rastreabilidade do prontuário).
-- Cada alteração em content/chief_complaint/cid guarda a versão anterior em edit_history.
alter table public.evolutions
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid,
  add column if not exists updated_by_name text,
  add column if not exists edit_history jsonb not null default '[]'::jsonb;

create or replace function public.evolutions_track_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- campos de origem e histórico não podem ser alterados pelo cliente
  new.id := old.id;
  new.clinic_id := old.clinic_id;
  new.patient_id := old.patient_id;
  new.professional_id := old.professional_id;
  new.professional_name := old.professional_name;
  new.created_at := old.created_at;
  new.edit_history := old.edit_history;

  if (new.content, new.chief_complaint, new.cid) is distinct from (old.content, old.chief_complaint, old.cid) then
    new.edit_history := coalesce(old.edit_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'content', old.content,
      'chief_complaint', old.chief_complaint,
      'cid', old.cid,
      'saved_at', coalesce(old.updated_at, old.created_at),
      'by', coalesce(old.updated_by_name, old.professional_name)
    ));
    new.updated_at := now();
    new.updated_by := auth.uid();
  else
    new.updated_at := old.updated_at;
    new.updated_by := old.updated_by;
    new.updated_by_name := old.updated_by_name;
  end if;
  return new;
end
$$;

revoke execute on function public.evolutions_track_edit() from public, anon, authenticated;

drop trigger if exists evolutions_track_edit on public.evolutions;
create trigger evolutions_track_edit
  before update on public.evolutions
  for each row execute function public.evolutions_track_edit();
