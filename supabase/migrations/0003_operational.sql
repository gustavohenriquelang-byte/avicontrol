-- =============================================================================
-- Avicontrol · Migration 0003 · Operacional (Etapa 3)
-- Lançamento diário (produção, ovos, ração, água, ambiente, mortalidade) e
-- registros detalhados de mortalidade.
-- =============================================================================

create type daily_record_status as enum ('draft', 'closed');

create type mortality_reason as enum (
  'desconhecida', 'doenca', 'acidente', 'canibalismo', 'locomotor',
  'respiratorio', 'baixa_produtividade', 'descarte_sanitario', 'outro'
);

-- -----------------------------------------------------------------------------
-- daily_records: um lançamento por lote/data (item 12)
-- -----------------------------------------------------------------------------
create table daily_records (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  farm_id           uuid not null references farms(id) on delete cascade,
  house_id          uuid references houses(id) on delete set null,
  flock_id          uuid not null references flocks(id) on delete cascade,
  record_date       date not null,
  collection_time   time,
  birds_start       integer not null default 0,      -- aves no início do dia

  -- Ovos: total e classificação (item 12/13)
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

-- No máximo um lançamento FECHADO por lote/data (item 12).
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
-- RLS: operador pode escrever lançamentos e mortalidade (item 7)
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
