-- Bloqueios de agenda (dia inteiro ou faixa de horário) feitos pela tela "Horários e bloqueios".
-- Ficam em work_events com kind = 'bloqueio': somem da página de agendamento dos pacientes
-- na hora e vão para o Google Agenda da clínica pela fila google_jobs (script, até 5 min).

alter table public.work_events drop constraint if exists work_events_kind_check;
alter table public.work_events add constraint work_events_kind_check
  check (kind = any (array['plantao','atendimento','cirurgia','parto','reuniao','pessoal','outro','google','bloqueio']));

-- Bloqueio não tem deslocamento: só tira exatamente o período bloqueado.
create or replace function public.public_slots(p_slug text, p_professional uuid, p_from date, p_days integer default 14)
 returns table(starts_at timestamp with time zone, modality text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare c public.clinics; m public.clinic_members; d date; a record; t timestamptz; tend timestamptz; step interval; online_ok boolean; busy_on boolean; busy_pre boolean;
begin
  select * into c from public.clinics where slug = lower(trim(p_slug)) and public_booking;
  if not found then return; end if;
  select * into m from public.clinic_members where clinic_id = c.id and user_id = p_professional and role in ('owner','dentista');
  if not found then return; end if;
  step := make_interval(mins => m.slot_min);
  online_ok := m.accepts_online and (m.meet_url is not null or c.booking_requires_approval);
  for d in select generate_series(greatest(p_from, (now() at time zone 'America/Sao_Paulo')::date), least(p_from + least(greatest(p_days,1),31) - 1, (now() at time zone 'America/Sao_Paulo')::date + 60), interval '1 day')::date loop
    for a in select * from public.availability v where v.clinic_id = c.id and v.professional_id = m.user_id and v.weekday = extract(dow from d)::int order by v.start_time loop
      t := (d + a.start_time) at time zone 'America/Sao_Paulo';
      tend := (d + a.end_time) at time zone 'America/Sao_Paulo';
      while t + step <= tend loop
        if t >= now() + make_interval(hours => c.min_lead_hours)
           and not exists (select 1 from public.appointments x where x.professional_id = m.user_id and x.status not in ('cancelado','faltou') and coalesce(x.approval,'') <> 'recusado' and x.starts_at < t + step and x.ends_at > t) then
          -- online: só não pode sobrepor; presencial: precisa de tempo para chegar/sair do outro local (bloqueio não soma deslocamento)
          busy_on := exists (select 1 from public.work_events w where w.professional_id = m.user_id and w.clinic_id = c.id and w.starts_at < t + step and w.ends_at > t);
          busy_pre := exists (select 1 from public.work_events w left join public.work_places pl on pl.id = w.place_id
                       where w.professional_id = m.user_id and w.clinic_id = c.id
                         and w.starts_at < t + step + make_interval(mins => case when w.kind = 'bloqueio' then 0 else coalesce(pl.travel_min, 30) end)
                         and w.ends_at > t - make_interval(mins => case when w.kind = 'bloqueio' then 0 else coalesce(pl.travel_min, 30) end));
          if a.modality in ('ambos','online') and online_ok and not busy_on then starts_at := t; modality := 'online'; return next; end if;
          if a.modality in ('ambos','presencial') and m.accepts_presencial and not busy_pre then starts_at := t; modality := 'presencial'; return next; end if;
        end if;
        t := t + step;
      end loop;
    end loop;
  end loop;
end $function$;

create index if not exists work_events_pro_time on public.work_events (professional_id, starts_at);
