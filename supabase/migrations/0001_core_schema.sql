-- =============================================================================
-- Avicontrol · Migration 0001 · Núcleo (Etapa 1)
-- Multiempresa, hierarquia Empresa→Granja→Núcleo→Aviário→Lote, auth e auditoria.
-- Banco em UTC. Todas as tabelas operacionais possuem organization_id.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type user_role as enum (
  'admin', 'gerente', 'operador', 'veterinario', 'comercial', 'consulta'
);

create type housing_system as enum (
  'gaiolas_convencionais', 'cage_free', 'free_range', 'caipira', 'organico', 'outro'
);

create type house_status as enum ('ativo', 'inativo', 'manutencao', 'vazio_sanitario');

create type flock_status as enum (
  'recria', 'pre_postura', 'producao', 'muda', 'encerrado', 'vazio_sanitario'
);

create type flock_movement_type as enum (
  'entrada', 'transferencia', 'mortalidade', 'descarte', 'venda', 'ajuste', 'encerramento'
);

-- -----------------------------------------------------------------------------
-- Função utilitária: touch updated_at
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- organizations (empresas)
-- -----------------------------------------------------------------------------
create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  legal_name   text,
  tax_id       text,                       -- CNPJ
  phone        text,
  email        text,
  city         text,
  state        text,
  timezone     text not null default 'America/Sao_Paulo',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- profiles (espelho de auth.users; 1:1)
-- -----------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Cria profile automaticamente ao criar usuário no auth.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -----------------------------------------------------------------------------
-- organization_users (usuário ↔ empresa, com perfil)
-- -----------------------------------------------------------------------------
create table organization_users (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             user_role not null default 'consulta',
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_users_user on organization_users(user_id) where active;
create index idx_org_users_org on organization_users(organization_id) where active;
create trigger trg_org_users_updated before update on organization_users
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- farms (granjas)
-- -----------------------------------------------------------------------------
create table farms (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  code             text not null,
  name             text not null,
  city             text,
  state            text,
  address          text,
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (organization_id, code)
);
create index idx_farms_org on farms(organization_id);
create trigger trg_farms_updated before update on farms
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- farm_units (núcleos, opcional)
-- -----------------------------------------------------------------------------
create table farm_units (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid not null references farms(id) on delete cascade,
  code             text not null,
  name             text not null,
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (farm_id, code)
);
create index idx_farm_units_org on farm_units(organization_id);
create index idx_farm_units_farm on farm_units(farm_id);
create trigger trg_farm_units_updated before update on farm_units
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- houses (aviários / galpões)
-- -----------------------------------------------------------------------------
create table houses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid not null references farms(id) on delete cascade,
  farm_unit_id     uuid references farm_units(id) on delete set null,
  code             text not null,
  name             text not null,
  capacity         integer,
  installation_type text,
  housing_system   housing_system not null default 'gaiolas_convencionais',
  area_m2          numeric(10,2),
  cages_count      integer,
  status           house_status not null default 'ativo',
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (farm_id, code)
);
create index idx_houses_org on houses(organization_id);
create index idx_houses_farm on houses(farm_id);
create trigger trg_houses_updated before update on houses
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- breeds (linhagens) e breed_curves (curvas de linhagem)
-- -----------------------------------------------------------------------------
create table breeds (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  supplier         text,
  color            text,                    -- ex.: branca, vermelha
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (organization_id, name)
);
create index idx_breeds_org on breeds(organization_id);
create trigger trg_breeds_updated before update on breeds
  for each row execute function set_updated_at();

-- Curva esperada por idade (semana): postura, peso, consumo.
create table breed_curves (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  breed_id         uuid not null references breeds(id) on delete cascade,
  age_weeks        integer not null,
  expected_laying_rate numeric(5,2),        -- %
  expected_weight_g    numeric(8,2),        -- gramas
  expected_feed_g      numeric(8,2),        -- g/ave/dia
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (breed_id, age_weeks)
);
create index idx_breed_curves_org on breed_curves(organization_id);
create index idx_breed_curves_breed on breed_curves(breed_id);
create trigger trg_breed_curves_updated before update on breed_curves
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- flocks (lotes)
-- -----------------------------------------------------------------------------
create table flocks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid not null references farms(id) on delete cascade,
  house_id         uuid references houses(id) on delete set null,
  breed_id         uuid references breeds(id) on delete set null,
  code             text not null,
  supplier         text,
  birth_date       date,
  housing_date     date,
  initial_quantity integer not null default 0,
  current_quantity integer not null default 0,
  age_at_housing_days integer,
  acquisition_cost numeric(14,2),
  initial_avg_weight_g numeric(8,2),
  expected_laying_start date,
  expected_cull_date   date,
  status           flock_status not null default 'recria',
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (farm_id, code)
);
create index idx_flocks_org on flocks(organization_id);
create index idx_flocks_farm on flocks(farm_id);
create index idx_flocks_house on flocks(house_id);
create index idx_flocks_status on flocks(status);
create trigger trg_flocks_updated before update on flocks
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- flock_movements (histórico de movimentações do lote)
-- -----------------------------------------------------------------------------
create table flock_movements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  flock_id         uuid not null references flocks(id) on delete cascade,
  movement_type    flock_movement_type not null,
  movement_date    date not null default (now() at time zone 'utc')::date,
  quantity         integer not null default 0,   -- +entrada / −saída
  reason           text,
  reference        text,                          -- doc, lote destino, etc.
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_flock_mov_org on flock_movements(organization_id);
create index idx_flock_mov_flock on flock_movements(flock_id);

-- -----------------------------------------------------------------------------
-- settings (configurações por organização) e audit_logs
-- -----------------------------------------------------------------------------
create table settings (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  key              text not null,
  value            jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, key)
);
create index idx_settings_org on settings(organization_id);
create trigger trg_settings_updated before update on settings
  for each row execute function set_updated_at();

create table audit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete set null,
  user_id          uuid references auth.users(id) on delete set null,
  action           text not null,           -- insert | update | delete | ...
  table_name       text not null,
  record_id        text,
  old_value        jsonb,
  new_value        jsonb,
  ip               text,
  device           text,
  created_at       timestamptz not null default now()
);
create index idx_audit_org on audit_logs(organization_id);
create index idx_audit_table on audit_logs(table_name);
create index idx_audit_created on audit_logs(created_at);
