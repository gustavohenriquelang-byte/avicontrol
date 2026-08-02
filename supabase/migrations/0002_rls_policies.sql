-- =============================================================================
-- Avicontrol · Migration 0002 · Row Level Security (item 6 e 30)
-- Isolamento por organização. Um usuário nunca acessa dados de outra org.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções auxiliares de autorização (SECURITY DEFINER para evitar recursão RLS)
-- -----------------------------------------------------------------------------

-- IDs das organizações às quais o usuário atual pertence (ativo).
create or replace function auth_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select organization_id
  from organization_users
  where user_id = auth.uid() and active = true;
$$;

-- Verdadeiro se o usuário pertence à organização informada.
create or replace function is_org_member(org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_users
    where user_id = auth.uid() and organization_id = org and active = true
  );
$$;

-- Perfil do usuário atual na organização informada.
create or replace function current_org_role(org uuid)
returns user_role
language sql stable security definer set search_path = public as $$
  select role from organization_users
  where user_id = auth.uid() and organization_id = org and active = true
  limit 1;
$$;

-- Verdadeiro se o usuário tem um dos perfis informados na organização.
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
-- profiles: cada um vê/edita o próprio; membros da mesma org podem ler colegas
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
-- INSERT de organização é feito via server action (service role) no fluxo de onboarding.

-- -----------------------------------------------------------------------------
-- organization_users: membros leem a própria org; admin gerencia
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
-- Política padrão para tabelas operacionais com organization_id.
-- SELECT: qualquer membro. INSERT/UPDATE/DELETE: perfis com permissão de escrita.
-- (O controle fino por módulo é reforçado nas server actions.)
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
