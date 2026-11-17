-- A agenda da MH.Cuidar deixa de ter regra fixa no banco (quartas fechadas, só 14h–20h).
-- Agora tudo é definido pela tela "Horários e bloqueios" (semana padrão + bloqueios).
drop trigger if exists trg_mhcuidar_hours on public.availability;
drop function if exists public.enforce_mhcuidar_hours();
