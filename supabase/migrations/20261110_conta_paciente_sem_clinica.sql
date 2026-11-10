-- Conta de paciente criada pela clínica (reset-link, mode = 'create') não pode virar dona de um
-- "Meu Consultório" novo: o gatilho sai antes de criar clínica quando vem a marca created_by_clinic.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.handle_new_user()'::regprocedure);
  if position('created_by_clinic' in d) = 0 then
    d := replace(d, $r$  if coalesce(meta->>'invite_code','') <> '' then$r$,
      $r$  if coalesce(meta->>'created_by_clinic','') = 'true' then
    return new; -- paciente cadastrado pela clínica: a edge function liga a conta à ficha
  end if;
  if coalesce(meta->>'invite_code','') <> '' then$r$);
    execute d;
  end if;
end $$;
