-- =============================================================================
-- Avicontrol · Migration 0005 · Esterco / cama de aviário
-- Produção/estoque de esterco e vendas de esterco (receita adicional).
-- =============================================================================

create type manure_unit as enum ('kg', 'tonelada', 'saco', 'big_bag', 'm3');

-- -----------------------------------------------------------------------------
-- Produção de esterco (entrada no estoque)
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
-- RLS: comercial e operacional podem lançar; leitura para membros
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
