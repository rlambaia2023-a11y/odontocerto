-- Abertura extra: abre atendimento numa data específica que está fechada na semana padrão
-- (ex.: uma quarta-feira). Feita pela tela "Horários e bloqueios"; some quando a data passa.
create table if not exists public.availability_dates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  start_time time not null,
  end_time time not null,
  modality text not null default 'ambos' check (modality in ('ambos','online','presencial')),
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists availability_dates_pro_day on public.availability_dates (professional_id, day);
alter table public.availability_dates enable row level security;
drop policy if exists clinic_rw on public.availability_dates;
create policy clinic_rw on public.availability_dates for all
  using (clinic_id in (select public.my_clinic_ids())) with check (clinic_id in (select public.my_clinic_ids()));
grant select, insert, update, delete on public.availability_dates to authenticated;

-- geração dos horários (semana padrão + aberturas extras), sem repetir horário
create or replace function public.slots_core(p_slug text, p_professional uuid, p_from date, p_days integer default 14)
 returns table(starts_at timestamp with time zone, modality text)
 language plpgsql stable security definer set search_path to 'public'
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
    for a in select v.start_time, v.end_time, v.modality from public.availability v where v.clinic_id = c.id and v.professional_id = m.user_id and v.weekday = extract(dow from d)::int
             union all
             select x.start_time, x.end_time, x.modality from public.availability_dates x where x.clinic_id = c.id and x.professional_id = m.user_id and x.day = d
             order by 1 loop
      t := (d + a.start_time) at time zone 'America/Sao_Paulo';
      tend := (d + a.end_time) at time zone 'America/Sao_Paulo';
      while t + step <= tend loop
        if t >= now() + make_interval(hours => c.min_lead_hours)
           and not exists (select 1 from public.appointments x where x.professional_id = m.user_id and x.status not in ('cancelado','faltou') and coalesce(x.approval,'') <> 'recusado' and x.starts_at < t + step and x.ends_at > t) then
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

create or replace function public.public_slots(p_slug text, p_professional uuid, p_from date, p_days integer default 14)
 returns table(starts_at timestamp with time zone, modality text)
 language sql stable security definer set search_path to 'public'
as $$ select distinct s.starts_at, s.modality from public.slots_core(p_slug, p_professional, p_from, p_days) s order by 1, 2 $$;

-- profissional aparece na página se tiver semana padrão OU alguma abertura extra futura
create or replace function public.public_clinic(p_slug text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id', c.id, 'slug', c.slug, 'name', c.name, 'city', c.city, 'state', c.state, 'address', c.address, 'phone', c.phone, 'note', c.booking_note, 'logo_url', c.logo_url,
    'theme_primary', c.theme_primary, 'theme_accent', c.theme_accent,
    'requires_approval', c.booking_requires_approval,
    'professionals', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'full_name', m.full_name, 'council', m.council, 'council_number', m.council_number, 'council_uf', m.council_uf,
        'specialty', m.specialty, 'profession', m.profession, 'bio', m.bio, 'online', m.accepts_online and (m.meet_url is not null or c.booking_requires_approval), 'presencial', m.accepts_presencial, 'slot_min', m.slot_min, 'online_price', m.online_price) order by m.full_name)
      from public.clinic_members m where m.clinic_id = c.id and m.role in ('owner','dentista')
        and (exists (select 1 from public.availability a where a.professional_id = m.user_id and a.clinic_id = c.id)
          or exists (select 1 from public.availability_dates x where x.professional_id = m.user_id and x.clinic_id = c.id and x.day >= (now() at time zone 'America/Sao_Paulo')::date))), '[]'::jsonb))
  from public.clinics c where c.slug = lower(trim(p_slug)) and c.public_booking
$function$;
