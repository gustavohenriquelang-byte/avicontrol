-- =============================================================================
-- Avicontrol · Migration 0007 · Pesagens, Ambiente, Sanidade, Tarefas, Alertas
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
  uniformity       numeric(6,2),        -- % dentro de ±10% da média
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
  route            text,                -- via de aplicação
  doses            integer,
  withdrawal_days  integer default 0,   -- carência
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
  kind             text,                -- antibiótico, vitamina, etc.
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
  withdrawal_until date,                -- fim da carência
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
  -- técnico/veterinário e operacional participam da sanidade/pesagem/ambiente
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
