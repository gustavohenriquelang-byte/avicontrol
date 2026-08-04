-- Avicontrol - schema completo (migrations concatenadas)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.


-- ============ 0001_core_schema.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0001 Â· NÃºcleo (Etapa 1)
-- Multiempresa, hierarquia Empresaâ†’Granjaâ†’NÃºcleoâ†’AviÃ¡rioâ†’Lote, auth e auditoria.
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
-- FunÃ§Ã£o utilitÃ¡ria: touch updated_at
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

-- Cria profile automaticamente ao criar usuÃ¡rio no auth.
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
-- organization_users (usuÃ¡rio â†” empresa, com perfil)
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
-- farm_units (nÃºcleos, opcional)
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
-- houses (aviÃ¡rios / galpÃµes)
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
-- flock_movements (histÃ³rico de movimentaÃ§Ãµes do lote)
-- -----------------------------------------------------------------------------
create table flock_movements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  flock_id         uuid not null references flocks(id) on delete cascade,
  movement_type    flock_movement_type not null,
  movement_date    date not null default (now() at time zone 'utc')::date,
  quantity         integer not null default 0,   -- +entrada / âˆ’saÃ­da
  reason           text,
  reference        text,                          -- doc, lote destino, etc.
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_flock_mov_org on flock_movements(organization_id);
create index idx_flock_mov_flock on flock_movements(flock_id);

-- -----------------------------------------------------------------------------
-- settings (configuraÃ§Ãµes por organizaÃ§Ã£o) e audit_logs
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


-- ============ 0002_rls_policies.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0002 Â· Row Level Security (item 6 e 30)
-- Isolamento por organizaÃ§Ã£o. Um usuÃ¡rio nunca acessa dados de outra org.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FunÃ§Ãµes auxiliares de autorizaÃ§Ã£o (SECURITY DEFINER para evitar recursÃ£o RLS)
-- -----------------------------------------------------------------------------

-- IDs das organizaÃ§Ãµes Ã s quais o usuÃ¡rio atual pertence (ativo).
create or replace function auth_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id
  from organization_users
  where user_id = auth.uid() and active = true;
$$;

-- Verdadeiro se o usuÃ¡rio pertence Ã  organizaÃ§Ã£o informada.
create or replace function is_org_member(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_users
    where user_id = auth.uid() and organization_id = org and active = true
  );
$$;

-- Perfil do usuÃ¡rio atual na organizaÃ§Ã£o informada.
create or replace function current_org_role(org uuid)
returns user_role
language sql stable security definer set search_path = public as $$
  select role from organization_users
  where user_id = auth.uid() and organization_id = org and active = true
  limit 1;
$$;

-- Verdadeiro se o usuÃ¡rio tem um dos perfis informados na organizaÃ§Ã£o.
create or replace function has_org_role(org uuid, roles user_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_users
    where user_id = auth.uid()
      and organization_id = org
      and active = true
      and role = any(roles)
  );
$$;

-- -----------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas
-- -----------------------------------------------------------------------------
alter table organizations       enable row level security;
alter table profiles            enable row level security;
alter table organization_users  enable row level security;
alter table farms               enable row level security;
alter table farm_units          enable row level security;
alter table houses              enable row level security;
alter table breeds              enable row level security;
alter table breed_curves        enable row level security;
alter table flocks              enable row level security;
alter table flock_movements     enable row level security;
alter table settings            enable row level security;
alter table audit_logs          enable row level security;

-- -----------------------------------------------------------------------------
-- profiles: cada um vÃª/edita o prÃ³prio; membros da mesma org podem ler colegas
-- -----------------------------------------------------------------------------
create policy profiles_select_self on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from organization_users ou1
      join organization_users ou2 on ou1.organization_id = ou2.organization_id
      where ou1.user_id = auth.uid() and ou2.user_id = profiles.id
        and ou1.active and ou2.active
    )
  );
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations: membros leem; apenas admin edita
-- -----------------------------------------------------------------------------
create policy organizations_select on organizations
  for select using (is_org_member(id));
create policy organizations_update on organizations
  for update using (has_org_role(id, array['admin']::user_role[]))
  with check (has_org_role(id, array['admin']::user_role[]));
-- INSERT de organizaÃ§Ã£o Ã© feito via server action (service role) no fluxo de onboarding.

-- -----------------------------------------------------------------------------
-- organization_users: membros leem a prÃ³pria org; admin gerencia
-- -----------------------------------------------------------------------------
create policy org_users_select on organization_users
  for select using (is_org_member(organization_id));
create policy org_users_insert on organization_users
  for insert with check (has_org_role(organization_id, array['admin']::user_role[]));
create policy org_users_update on organization_users
  for update using (has_org_role(organization_id, array['admin']::user_role[]))
  with check (has_org_role(organization_id, array['admin']::user_role[]));
create policy org_users_delete on organization_users
  for delete using (has_org_role(organization_id, array['admin']::user_role[]));

-- -----------------------------------------------------------------------------
-- PolÃ­tica padrÃ£o para tabelas operacionais com organization_id.
-- SELECT: qualquer membro. INSERT/UPDATE/DELETE: perfis com permissÃ£o de escrita.
-- (O controle fino por mÃ³dulo Ã© reforÃ§ado nas server actions.)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  write_roles text := 'array[''admin'',''gerente'']::user_role[]';
begin
  foreach t in array array[
    'farms','farm_units','houses','breeds','breed_curves',
    'flocks','flock_movements','settings'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (is_org_member(organization_id));
    $f$, t);

    execute format($f$
      create policy %1$s_insert on %1$s
        for insert with check (has_org_role(organization_id, %2$s));
    $f$, t, write_roles);

    execute format($f$
      create policy %1$s_update on %1$s
        for update using (has_org_role(organization_id, %2$s))
        with check (has_org_role(organization_id, %2$s));
    $f$, t, write_roles);

    execute format($f$
      create policy %1$s_delete on %1$s
        for delete using (has_org_role(organization_id, array['admin']::user_role[]));
    $f$, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- audit_logs: membros leem; qualquer membro pode inserir (via app); sem update/delete
-- -----------------------------------------------------------------------------
create policy audit_select on audit_logs
  for select using (organization_id is not null and is_org_member(organization_id));
create policy audit_insert on audit_logs
  for insert with check (organization_id is null or is_org_member(organization_id));


-- ============ 0003_operational.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0003 Â· Operacional (Etapa 3)
-- LanÃ§amento diÃ¡rio (produÃ§Ã£o, ovos, raÃ§Ã£o, Ã¡gua, ambiente, mortalidade) e
-- registros detalhados de mortalidade.
-- =============================================================================

create type daily_record_status as enum ('draft', 'closed');

create type mortality_reason as enum (
  'desconhecida', 'doenca', 'acidente', 'canibalismo', 'locomotor',
  'respiratorio', 'baixa_produtividade', 'descarte_sanitario', 'outro'
);

-- -----------------------------------------------------------------------------
-- daily_records: um lanÃ§amento por lote/data (item 12)
-- -----------------------------------------------------------------------------
create table daily_records (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  farm_id           uuid not null references farms(id) on delete cascade,
  house_id          uuid references houses(id) on delete set null,
  flock_id          uuid not null references flocks(id) on delete cascade,
  record_date       date not null,
  collection_time   time,
  birds_start       integer not null default 0,      -- aves no inÃ­cio do dia

  -- Ovos: total e classificaÃ§Ã£o (item 12/13)
  eggs_total        integer not null default 0,
  eggs_good         integer not null default 0,      -- bons
  eggs_dirty        integer not null default 0,      -- sujos
  eggs_cracked      integer not null default 0,      -- trincados
  eggs_broken       integer not null default 0,      -- quebrados
  eggs_deformed     integer not null default 0,      -- deformados
  eggs_double_yolk  integer not null default 0,      -- duas gemas
  eggs_industrial   integer not null default 0,      -- industriais
  eggs_discarded    integer not null default 0,      -- descartados

  -- Consumo
  feed_kg           numeric(12,3) not null default 0,
  water_l           numeric(12,2) not null default 0,

  -- Baixas
  mortality         integer not null default 0,
  culls             integer not null default 0,       -- descartes

  -- Ambiente
  temp_min          numeric(5,2),
  temp_max          numeric(5,2),
  humidity          numeric(5,2),

  notes             text,
  status            daily_record_status not null default 'draft',
  adjustment_justification text,                        -- justifica soma divergente

  created_by        uuid references auth.users(id),
  closed_by         uuid references auth.users(id),
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_daily_org on daily_records(organization_id);
create index idx_daily_flock_date on daily_records(flock_id, record_date);
create index idx_daily_date on daily_records(organization_id, record_date);
create trigger trg_daily_updated before update on daily_records
  for each row execute function set_updated_at();

-- No mÃ¡ximo um lanÃ§amento FECHADO por lote/data (item 12).
create unique index uq_daily_closed
  on daily_records(flock_id, record_date)
  where status = 'closed';

-- -----------------------------------------------------------------------------
-- mortality_records: registros detalhados de mortalidade (item 16)
-- -----------------------------------------------------------------------------
create table mortality_records (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  flock_id          uuid not null references flocks(id) on delete cascade,
  house_id          uuid references houses(id) on delete set null,
  record_date       date not null,
  quantity          integer not null default 0,
  reason            mortality_reason not null default 'desconhecida',
  cause_note        text,
  responsible       text,
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_mortality_org on mortality_records(organization_id);
create index idx_mortality_flock on mortality_records(flock_id, record_date);
create trigger trg_mortality_updated before update on mortality_records
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: operador pode escrever lanÃ§amentos e mortalidade (item 7)
-- -----------------------------------------------------------------------------
alter table daily_records     enable row level security;
alter table mortality_records enable row level security;

do $$
declare
  t text;
  write_roles text := 'array[''admin'',''gerente'',''operador'']::user_role[]';
begin
  foreach t in array array['daily_records','mortality_records']
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (is_org_member(organization_id));
    $f$, t);

    execute format($f$
      create policy %1$s_insert on %1$s
        for insert with check (has_org_role(organization_id, %2$s));
    $f$, t, write_roles);

    execute format($f$
      create policy %1$s_update on %1$s
        for update using (has_org_role(organization_id, %2$s))
        with check (has_org_role(organization_id, %2$s));
    $f$, t, write_roles);

    execute format($f$
      create policy %1$s_delete on %1$s
        for delete using (has_org_role(organization_id, array['admin','gerente']::user_role[]));
    $f$, t);
  end loop;
end $$;


-- ============ 0004_inventory.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0004 Â· Estoques (Etapa 4)
-- RaÃ§Ã£o (tipos, compras, estoque com custo mÃ©dio ponderado, movimentaÃ§Ãµes) e
-- estoque de ovos com rastreabilidade.
-- =============================================================================

create type feed_movement_type as enum (
  'compra', 'consumo', 'transferencia', 'perda', 'ajuste', 'inventario'
);

create type egg_quality as enum (
  'bom', 'sujo', 'trincado', 'quebrado', 'deformado', 'industrial', 'descartado'
);

create type egg_movement_type as enum (
  'producao', 'classificacao', 'transferencia', 'venda', 'descarte', 'ajuste', 'inventario'
);

-- -----------------------------------------------------------------------------
-- RaÃ§Ã£o: tipos, compras, estoque, movimentaÃ§Ãµes (item 15)
-- -----------------------------------------------------------------------------
create table feed_types (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  description      text,
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (organization_id, name)
);
create index idx_feed_types_org on feed_types(organization_id);
create trigger trg_feed_types_updated before update on feed_types
  for each row execute function set_updated_at();

create table feed_purchases (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  feed_type_id     uuid not null references feed_types(id) on delete restrict,
  farm_id          uuid references farms(id) on delete set null,
  purchase_date    date not null default (now() at time zone 'utc')::date,
  supplier         text,
  quantity_kg      numeric(14,3) not null default 0,
  unit_cost        numeric(14,4) not null default 0,   -- R$/kg
  total_cost       numeric(14,2) not null default 0,   -- R$
  invoice          text,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_feed_purchases_org on feed_purchases(organization_id);
create index idx_feed_purchases_type on feed_purchases(feed_type_id);

-- Estoque atual por tipo de raÃ§Ã£o (custo mÃ©dio ponderado no nÃ­vel da organizaÃ§Ã£o).
create table feed_inventory (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  feed_type_id     uuid not null references feed_types(id) on delete cascade,
  quantity_kg      numeric(14,3) not null default 0,
  avg_cost         numeric(14,4) not null default 0,   -- R$/kg (mÃ©dia ponderada)
  updated_at       timestamptz not null default now(),
  unique (organization_id, feed_type_id)
);
create index idx_feed_inventory_org on feed_inventory(organization_id);
create trigger trg_feed_inventory_updated before update on feed_inventory
  for each row execute function set_updated_at();

create table feed_movements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  feed_type_id     uuid not null references feed_types(id) on delete cascade,
  farm_id          uuid references farms(id) on delete set null,
  movement_type    feed_movement_type not null,
  movement_date    date not null default (now() at time zone 'utc')::date,
  quantity_kg      numeric(14,3) not null default 0,   -- + entrada / âˆ’ saÃ­da
  unit_cost        numeric(14,4),
  reference        text,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_feed_mov_org on feed_movements(organization_id);
create index idx_feed_mov_type on feed_movements(feed_type_id);

-- -----------------------------------------------------------------------------
-- Estoque de ovos com rastreabilidade (item 14)
-- -----------------------------------------------------------------------------
create table egg_inventory (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid not null references farms(id) on delete cascade,
  flock_id         uuid references flocks(id) on delete set null,
  location         text,
  production_date  date not null,
  quality          egg_quality not null default 'bom',
  weight_category  text,                                -- configurÃ¡vel (P, M, G, XG...)
  quantity         integer not null default 0,          -- unidades disponÃ­veis
  expiry_date      date,
  trace_code       text not null,                       -- OVO-2026-07-24-G01-L03-...
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, trace_code)
);
create index idx_egg_inv_org on egg_inventory(organization_id);
create index idx_egg_inv_farm on egg_inventory(farm_id);
create trigger trg_egg_inv_updated before update on egg_inventory
  for each row execute function set_updated_at();

create table egg_inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  egg_inventory_id uuid not null references egg_inventory(id) on delete cascade,
  movement_type    egg_movement_type not null,
  movement_date    date not null default (now() at time zone 'utc')::date,
  quantity         integer not null default 0,          -- + entrada / âˆ’ saÃ­da
  reference        text,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_egg_mov_org on egg_inventory_movements(organization_id);
create index idx_egg_mov_inv on egg_inventory_movements(egg_inventory_id);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table feed_types              enable row level security;
alter table feed_purchases          enable row level security;
alter table feed_inventory          enable row level security;
alter table feed_movements          enable row level security;
alter table egg_inventory           enable row level security;
alter table egg_inventory_movements enable row level security;

do $$
declare
  t text;
  wr text := 'array[''admin'',''gerente'',''operador'']::user_role[]';
begin
  foreach t in array array[
    'feed_types','feed_purchases','feed_inventory','feed_movements',
    'egg_inventory','egg_inventory_movements'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on %1$s
        for insert with check (has_org_role(organization_id, %2$s));
    $f$, t, wr);
    execute format($f$
      create policy %1$s_update on %1$s
        for update using (has_org_role(organization_id, %2$s))
        with check (has_org_role(organization_id, %2$s));
    $f$, t, wr);
    execute format($f$
      create policy %1$s_delete on %1$s
        for delete using (has_org_role(organization_id, array['admin','gerente']::user_role[]));
    $f$, t);
  end loop;
end $$;


-- ============ 0005_manure.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0005 Â· Esterco / cama de aviÃ¡rio
-- ProduÃ§Ã£o/estoque de esterco e vendas de esterco (receita adicional).
-- =============================================================================

create type manure_unit as enum ('kg', 'tonelada', 'saco', 'big_bag', 'm3');

-- -----------------------------------------------------------------------------
-- ProduÃ§Ã£o de esterco (entrada no estoque)
-- -----------------------------------------------------------------------------
create table manure_production (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid references farms(id) on delete set null,
  house_id         uuid references houses(id) on delete set null,
  flock_id         uuid references flocks(id) on delete set null,
  production_date  date not null default (now() at time zone 'utc')::date,
  quantity         numeric(14,3) not null default 0,
  unit             manure_unit not null default 'kg',
  quantity_kg      numeric(14,3) not null default 0,   -- normalizado p/ estoque
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_manure_prod_org on manure_production(organization_id);
create index idx_manure_prod_date on manure_production(organization_id, production_date);

-- -----------------------------------------------------------------------------
-- Vendas de esterco (receita)
-- -----------------------------------------------------------------------------
create table manure_sales (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid references farms(id) on delete set null,
  sale_date        date not null default (now() at time zone 'utc')::date,
  buyer            text,                                -- comprador (texto livre)
  quantity         numeric(14,3) not null default 0,
  unit             manure_unit not null default 'tonelada',
  quantity_kg      numeric(14,3) not null default 0,    -- normalizado p/ estoque
  unit_price       numeric(14,2) not null default 0,    -- R$ por unidade vendida
  total            numeric(14,2) not null default 0,    -- receita (R$)
  payment_method   text,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_manure_sales_org on manure_sales(organization_id);
create index idx_manure_sales_date on manure_sales(organization_id, sale_date);

-- -----------------------------------------------------------------------------
-- RLS: comercial e operacional podem lanÃ§ar; leitura para membros
-- -----------------------------------------------------------------------------
alter table manure_production enable row level security;
alter table manure_sales      enable row level security;

do $$
declare
  t text;
  wr text := 'array[''admin'',''gerente'',''comercial'',''operador'']::user_role[]';
begin
  foreach t in array array['manure_production','manure_sales']
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on %1$s
        for insert with check (has_org_role(organization_id, %2$s));
    $f$, t, wr);
    execute format($f$
      create policy %1$s_update on %1$s
        for update using (has_org_role(organization_id, %2$s))
        with check (has_org_role(organization_id, %2$s));
    $f$, t, wr);
    execute format($f$
      create policy %1$s_delete on %1$s
        for delete using (has_org_role(organization_id, array['admin','gerente']::user_role[]));
    $f$, t);
  end loop;
end $$;


-- ============ 0006_onboarding.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0006 Â· Onboarding sem service_role
-- FunÃ§Ã£o segura (SECURITY DEFINER) que permite a um usuÃ¡rio autenticado criar
-- a sua primeira empresa e se tornar admin dela â€” sem depender da chave
-- service_role no servidor.
-- =============================================================================

create or replace function create_org_and_join(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UsuÃ¡rio nÃ£o autenticado';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nome da empresa Ã© obrigatÃ³rio';
  end if;

  insert into organizations (name)
  values (trim(p_name))
  returning id into v_org_id;

  insert into organization_users (organization_id, user_id, role, active)
  values (v_org_id, auth.uid(), 'admin', true);

  return v_org_id;
end;
$$;

grant execute on function create_org_and_join(text) to authenticated;


-- ============ 0007_health_env_tasks.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0007 Â· Pesagens, Ambiente, Sanidade, Tarefas, Alertas
-- (Etapa 5)
-- =============================================================================

create type health_event_type as enum (
  'vacinacao', 'medicacao', 'ocorrencia', 'tratamento'
);

create type schedule_status as enum (
  'programada', 'proxima', 'atrasada', 'realizada', 'cancelada'
);

create type task_priority as enum ('baixa', 'media', 'alta');
create type task_status as enum ('pendente', 'em_andamento', 'concluida', 'cancelada');

create type alert_level as enum ('informativo', 'atencao', 'critico');
create type alert_status as enum ('aberto', 'reconhecido', 'resolvido');

-- -----------------------------------------------------------------------------
-- bird_weights: pesagens (item 17)
-- -----------------------------------------------------------------------------
create table bird_weights (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  flock_id         uuid not null references flocks(id) on delete cascade,
  weigh_date       date not null default (now() at time zone 'utc')::date,
  age_days         integer,
  sample_size      integer not null default 0,
  mean_g           numeric(8,2),
  min_g            numeric(8,2),
  max_g            numeric(8,2),
  std_dev          numeric(8,2),
  cv               numeric(6,2),        -- %
  uniformity       numeric(6,2),        -- % dentro de Â±10% da mÃ©dia
  expected_g       numeric(8,2),        -- da curva da linhagem
  samples          jsonb,               -- pesos individuais (opcional)
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_bird_weights_org on bird_weights(organization_id);
create index idx_bird_weights_flock on bird_weights(flock_id, weigh_date);

-- -----------------------------------------------------------------------------
-- environment_records: ambiente (item 19)
-- -----------------------------------------------------------------------------
create table environment_records (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  farm_id          uuid references farms(id) on delete set null,
  house_id         uuid references houses(id) on delete set null,
  record_date      date not null default (now() at time zone 'utc')::date,
  temp_min         numeric(5,2),
  temp_max         numeric(5,2),
  temp_current     numeric(5,2),
  humidity         numeric(5,2),
  ammonia          numeric(6,2),        -- ppm
  co2              numeric(8,2),        -- ppm
  luminosity       numeric(8,2),        -- lux
  light_hours      numeric(4,1),
  ventilation      text,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_env_org on environment_records(organization_id);
create index idx_env_house on environment_records(house_id, record_date);

-- -----------------------------------------------------------------------------
-- vaccines e medications (cadastros)
-- -----------------------------------------------------------------------------
create table vaccines (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  manufacturer     text,
  target_disease   text,
  route            text,                -- via de aplicaÃ§Ã£o
  doses            integer,
  withdrawal_days  integer default 0,   -- carÃªncia
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);
create index idx_vaccines_org on vaccines(organization_id);
create trigger trg_vaccines_updated before update on vaccines
  for each row execute function set_updated_at();

create table medications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  manufacturer     text,
  kind             text,                -- antibiÃ³tico, vitamina, etc.
  withdrawal_days  integer default 0,
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);
create index idx_medications_org on medications(organization_id);
create trigger trg_medications_updated before update on medications
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- health_events e vaccination_schedules (item 18)
-- -----------------------------------------------------------------------------
create table health_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  flock_id         uuid references flocks(id) on delete set null,
  house_id         uuid references houses(id) on delete set null,
  event_date       date not null default (now() at time zone 'utc')::date,
  event_type       health_event_type not null,
  vaccine_id       uuid references vaccines(id) on delete set null,
  medication_id    uuid references medications(id) on delete set null,
  description      text,
  dose             text,
  responsible      text,
  withdrawal_until date,                -- fim da carÃªncia
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
create index idx_health_org on health_events(organization_id);
create index idx_health_flock on health_events(flock_id, event_date);

create table vaccination_schedules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  flock_id         uuid references flocks(id) on delete cascade,
  vaccine_id       uuid references vaccines(id) on delete set null,
  scheduled_date   date not null,
  status           schedule_status not null default 'programada',
  applied_date     date,
  responsible      text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_vsched_org on vaccination_schedules(organization_id);
create index idx_vsched_date on vaccination_schedules(organization_id, scheduled_date);
create trigger trg_vsched_updated before update on vaccination_schedules
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- tasks (item 25)
-- -----------------------------------------------------------------------------
create table tasks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  title            text not null,
  description      text,
  farm_id          uuid references farms(id) on delete set null,
  house_id         uuid references houses(id) on delete set null,
  flock_id         uuid references flocks(id) on delete set null,
  assigned_to      uuid references auth.users(id) on delete set null,
  priority         task_priority not null default 'media',
  due_date         date,
  recurrence       text,
  status           task_status not null default 'pendente',
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_tasks_org on tasks(organization_id);
create index idx_tasks_status on tasks(organization_id, status);
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- alerts (item 24)
-- -----------------------------------------------------------------------------
create table alerts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  alert_type       text not null,
  level            alert_level not null default 'atencao',
  title            text not null,
  message          text,
  entity_type      text,
  entity_id        text,
  status           alert_status not null default 'aberto',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_alerts_org on alerts(organization_id, status);
create trigger trg_alerts_updated before update on alerts
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table bird_weights          enable row level security;
alter table environment_records   enable row level security;
alter table vaccines              enable row level security;
alter table medications           enable row level security;
alter table health_events         enable row level security;
alter table vaccination_schedules enable row level security;
alter table tasks                 enable row level security;
alter table alerts                enable row level security;

do $$
declare
  t text;
  -- tÃ©cnico/veterinÃ¡rio e operacional participam da sanidade/pesagem/ambiente
  wr text := 'array[''admin'',''gerente'',''operador'',''veterinario'']::user_role[]';
begin
  foreach t in array array[
    'bird_weights','environment_records','vaccines','medications',
    'health_events','vaccination_schedules','tasks','alerts'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (is_org_member(organization_id));
    $f$, t);
    execute format($f$
      create policy %1$s_insert on %1$s
        for insert with check (has_org_role(organization_id, %2$s));
    $f$, t, wr);
    execute format($f$
      create policy %1$s_update on %1$s
        for update using (has_org_role(organization_id, %2$s))
        with check (has_org_role(organization_id, %2$s));
    $f$, t, wr);
    execute format($f$
      create policy %1$s_delete on %1$s
        for delete using (has_org_role(organization_id, array['admin','gerente']::user_role[]));
    $f$, t);
  end loop;
end $$;


-- ============ 0008_commercial_finance.sql ============

-- =============================================================================
-- Avicontrol Â· Migration 0008 Â· Clientes, Vendas e Financeiro (Etapa 6)
-- =============================================================================

create type sales_order_status as enum (
  'orcamento', 'pedido', 'separado', 'faturado', 'entregue', 'cancelado'
);
create type financial_entry_type as enum ('receita', 'despesa');
create type financial_entry_status as enum ('pendente', 'pago');

-- -----------------------------------------------------------------------------
-- customers (item 20) e products
-- -----------------------------------------------------------------------------
create table customers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  doc              text,                    -- CPF ou CNPJ
  phone            text,
  email            text,
  address          text,
  city             text,
  state            text,
  credit_limit     numeric(14,2) default 0,
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index idx_customers_org on customers(organization_id);
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

create table products (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  unit             text not null default 'duzia',   -- unidade de venda
  classification   text,                             -- qualidade/peso
  price            numeric(14,2) default 0,          -- preÃ§o sugerido
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);
create index idx_products_org on products(organization_id);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- sales_orders e sales_order_items (item 20)
-- -----------------------------------------------------------------------------
create table sales_orders (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  customer_id      uuid references customers(id) on delete set null,
  order_date       date not null default (now() at time zone 'utc')::date,
  status           sales_order_status not null default 'pedido',
  subtotal         numeric(14,2) not null default 0,
  discount         numeric(14,2) not null default 0,
  freight          numeric(14,2) not null default 0,
  total            numeric(14,2) not null default 0,
  payment_method   text,
  due_date         date,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_sales_org on sales_orders(organization_id);
create index idx_sales_customer on sales_orders(customer_id);
create trigger trg_sales_updated before update on sales_orders
  for each row execute function set_updated_at();

create table sales_order_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  order_id         uuid not null references sales_orders(id) on delete cascade,
  product_id       uuid references products(id) on delete set null,
  description      text not null,
  classification   text,
  quantity         numeric(14,3) not null default 0,
  unit             text not null default 'duzia',
  unit_price       numeric(14,2) not null default 0,
  total            numeric(14,2) not null default 0,
  created_at       timestamptz not null default now()
);
create index idx_sales_items_order on sales_order_items(order_id);

-- -----------------------------------------------------------------------------
-- financeiro (item 21): categorias e lanÃ§amentos unificados
-- Um lanÃ§amento pendente de receita = conta a receber; de despesa = conta a pagar.
-- -----------------------------------------------------------------------------
create table financial_categories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  kind             financial_entry_type not null,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (organization_id, name, kind)
);
create index idx_fincat_org on financial_categories(organization_id);

create table financial_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  entry_type       financial_entry_type not null,
  category_id      uuid references financial_categories(id) on delete set null,
  description      text not null,
  amount           numeric(14,2) not null default 0,
  entry_date       date not null default (now() at time zone 'utc')::date,
  due_date         date,
  paid_date        date,
  status           financial_entry_status not null default 'pendente',
  cost_center      text,
  farm_id          uuid references farms(id) on delete set null,
  flock_id         uuid references flocks(id) on delete set null,
  payment_method   text,
  source_type      text,                     -- ex.: 'sales_order', 'manure_sale'
  source_id        uuid,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_finent_org on financial_entries(organization_id);
create index idx_finent_date on financial_entries(organization_id, entry_date);
create index idx_finent_status on financial_entries(organization_id, status);
create trigger trg_finent_updated before update on financial_entries
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table customers            enable row level security;
alter table products             enable row level security;
alter table sales_orders         enable row level security;
alter table sales_order_items    enable row level security;
alter table financial_categories enable row level security;
alter table financial_entries    enable row level security;

-- Comercial gerencia clientes/produtos/vendas.
do $$
declare
  t text;
  wr text := 'array[''admin'',''gerente'',''comercial'']::user_role[]';
begin
  foreach t in array array['customers','products','sales_orders','sales_order_items']
  loop
    execute format($f$create policy %1$s_select on %1$s for select using (is_org_member(organization_id));$f$, t);
    execute format($f$create policy %1$s_insert on %1$s for insert with check (has_org_role(organization_id, %2$s));$f$, t, wr);
    execute format($f$create policy %1$s_update on %1$s for update using (has_org_role(organization_id, %2$s)) with check (has_org_role(organization_id, %2$s));$f$, t, wr);
    execute format($f$create policy %1$s_delete on %1$s for delete using (has_org_role(organization_id, array['admin','gerente']::user_role[]));$f$, t);
  end loop;
end $$;

-- Financeiro: admin/gerente escrevem; leitura para membros.
do $$
declare
  t text;
  wr text := 'array[''admin'',''gerente'']::user_role[]';
begin
  foreach t in array array['financial_categories','financial_entries']
  loop
    execute format($f$create policy %1$s_select on %1$s for select using (is_org_member(organization_id));$f$, t);
    execute format($f$create policy %1$s_insert on %1$s for insert with check (has_org_role(organization_id, %2$s));$f$, t, wr);
    execute format($f$create policy %1$s_update on %1$s for update using (has_org_role(organization_id, %2$s)) with check (has_org_role(organization_id, %2$s));$f$, t, wr);
    execute format($f$create policy %1$s_delete on %1$s for delete using (has_org_role(organization_id, %2$s));$f$, t, wr);
  end loop;
end $$;

