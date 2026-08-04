-- =============================================================================
-- Avicontrol · Migration 0008 · Clientes, Vendas e Financeiro (Etapa 6)
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
  price            numeric(14,2) default 0,          -- preço sugerido
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
-- financeiro (item 21): categorias e lançamentos unificados
-- Um lançamento pendente de receita = conta a receber; de despesa = conta a pagar.
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
