-- Módulo Contábil do médico: livro-caixa, Receita Saúde, carnê-leão, INSS, ISS, PJ (Simples / Presumido)
-- Os dados fiscais são pessoais de cada profissional: só a própria pessoa enxerga e altera os seus.

create table if not exists public.acc_profiles (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  regime text not null default 'pf' check (regime in ('pf','pj_simples','pj_presumido')),
  cnpj text,
  inss_mode text not null default 'teto' check (inss_mode in ('teto','renda','minimo','simplificado','nao')),
  inss_base numeric(12,2),
  dependentes int not null default 0 check (dependentes between 0 and 20),
  pensao numeric(12,2) not null default 0 check (pensao >= 0),
  iss_mode text not null default 'fixo' check (iss_mode in ('fixo','percentual','nao')),
  iss_pct numeric(5,2) not null default 0 check (iss_pct between 0 and 10),
  iss_fixo_anual numeric(12,2) not null default 0 check (iss_fixo_anual >= 0),
  pro_labore numeric(12,2) not null default 0 check (pro_labore >= 0),
  folha_mensal numeric(12,2) not null default 0 check (folha_mensal >= 0),
  equiparacao_hospitalar boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create table if not exists public.acc_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('receita','despesa','bem')),
  paid_on date not null,
  amount numeric(12,2) not null check (amount > 0),
  description text not null check (length(description) between 1 and 300),
  category text,
  deductible text not null default 'sim' check (deductible in ('sim','nao','confirmar')),
  payer_type text check (payer_type in ('pf','pj','exterior')),
  payer_name text,
  payer_doc text,
  beneficiary_name text,
  beneficiary_cpf text,
  patient_id uuid references public.patients(id) on delete set null,
  method text,
  irrf_retido numeric(12,2) not null default 0 check (irrf_retido >= 0),
  inss_retido numeric(12,2) not null default 0 check (inss_retido >= 0),
  receita_saude text not null default 'nao_se_aplica' check (receita_saude in ('pendente','emitido','nao_se_aplica')),
  receita_saude_code text,
  receita_saude_at timestamptz,
  doc_ref text,
  finance_entry_id uuid references public.finance_entries(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  check (kind <> 'receita' or payer_type is not null)
);
create index if not exists acc_entries_user_date_idx on public.acc_entries(clinic_id, user_id, paid_on);
create unique index if not exists acc_entries_finance_uniq on public.acc_entries(user_id, finance_entry_id) where finance_entry_id is not null;

create table if not exists public.acc_payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('carne_leao','inss','iss','das','pro_labore','irpj_csll','pis_cofins','irpf','dmed','defis','crm','outro')),
  competence date not null,
  amount numeric(12,2) check (amount is null or amount >= 0),
  paid_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, competence)
);

alter table public.acc_profiles enable row level security;
alter table public.acc_entries enable row level security;
alter table public.acc_payments enable row level security;

create policy "acc_own" on public.acc_profiles for all to authenticated
  using (user_id = auth.uid() and clinic_id in (select public.my_clinical_clinic_ids()))
  with check (user_id = auth.uid() and clinic_id in (select public.my_clinical_clinic_ids()));
create policy "acc_own" on public.acc_entries for all to authenticated
  using (user_id = auth.uid() and clinic_id in (select public.my_clinical_clinic_ids()))
  with check (user_id = auth.uid() and clinic_id in (select public.my_clinical_clinic_ids())
              and (patient_id is null or patient_id in (select id from public.patients where clinic_id = acc_entries.clinic_id))
              and (finance_entry_id is null or finance_entry_id in (select id from public.finance_entries where clinic_id = acc_entries.clinic_id)));
create policy "acc_own" on public.acc_payments for all to authenticated
  using (user_id = auth.uid() and clinic_id in (select public.my_clinical_clinic_ids()))
  with check (user_id = auth.uid() and clinic_id in (select public.my_clinical_clinic_ids()));

grant select, insert, update, delete on public.acc_profiles, public.acc_entries, public.acc_payments to authenticated;
revoke all on public.acc_profiles, public.acc_entries, public.acc_payments from anon;
