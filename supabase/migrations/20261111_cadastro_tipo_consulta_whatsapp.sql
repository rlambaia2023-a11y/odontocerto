-- Cadastro de paciente novo: tipo de consulta obrigatório e celular (WhatsApp) entra na exigência para liberar a agenda.
alter table public.patients add column if not exists consult_type text;

-- Agenda só libera com nome, CPF, nascimento, e-mail e celular com WhatsApp.
create or replace function public._profile_missing(p_id uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select nullif(concat_ws(', ',
    case when coalesce(trim(name),'') = '' then 'nome completo' end,
    case when cpf is null then 'CPF' end,
    case when birth_date is null then 'data de nascimento' end,
    case when email is null then 'e-mail' end,
    case when length(regexp_replace(coalesce(phone,''), '\D', '', 'g')) < 10 then 'celular com WhatsApp' end), '')
  from public.patients where id = p_id
$$;
revoke execute on function public._profile_missing(uuid) from public, anon;

-- A ficha criada (ou ligada) no cadastro online grava o tipo de consulta escolhido.
do $$
declare d text; s text := $s$
    update public.patients set consult_type = coalesce(consult_type, nullif(trim(m->>'consult_type'),'')) where id = pid;$s$;
begin
  d := pg_get_functiondef('public._self_patient(uuid,uuid)'::regprocedure);
  if position('consult_type' in d) = 0 then
    d := replace(d, E'    returning id into pid;\n    return pid;', E'    returning id into pid;' || s || E'\n    return pid;');
    d := replace(d, E'  returning id into pid;\n  return pid;', E'  returning id into pid;' || s || E'\n  return pid;');
    execute d;
  end if;
end $$;

-- Quem se cadastrou antes desta migração: o tipo de consulta ficou nos dados da conta; copia para a ficha.
update public.patients p set consult_type = nullif(trim(u.raw_user_meta_data->>'consult_type'), '')
from auth.users u where u.id = p.user_id and p.consult_type is null and nullif(trim(u.raw_user_meta_data->>'consult_type'), '') is not null;
