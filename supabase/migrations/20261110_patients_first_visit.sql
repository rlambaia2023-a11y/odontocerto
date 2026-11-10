alter table public.patients add column if not exists first_visit date check (first_visit is null or first_visit >= date '1900-01-01');
comment on column public.patients.first_visit is 'Data do primeiro atendimento (editável pela clínica)';
-- preenche com a consulta mais antiga já atendida, quando existir
update public.patients p set first_visit = x.d from (
  select patient_id, min((starts_at at time zone 'America/Sao_Paulo')::date) d from public.appointments
  where status = 'atendido' and starts_at <= now() group by patient_id) x
where x.patient_id = p.id and p.first_visit is null;
