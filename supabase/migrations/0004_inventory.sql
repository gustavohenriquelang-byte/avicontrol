-- =============================================================================
-- Avicontrol · Migration 0004 · Estoques (Etapa 4)
-- Ração (tipos, compras, estoque com custo médio ponderado, movimentações) e
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
-- Ração: tipos, compras, estoque, movimentações (item 15)
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

-- Estoque atual por tipo de ração (custo médio ponderado no nível da organização).
create table feed_inventory (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  feed_type_id     uuid not null references feed_types(id) on delete cascade,
  quantity_kg      numeric(14,3) not null default 0,
  avg_cost         numeric(14,4) not null default 0,   -- R$/kg (média ponderada)
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
  quantity_kg      numeric(14,3) not null default 0,   -- + entrada / − saída
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
  weight_category  text,                                -- configurável (P, M, G, XG...)
  quantity         integer not null default 0,          -- unidades disponíveis
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
  quantity         integer not null default 0,          -- + entrada / − saída
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
