-- =============================================================================
-- Avicontrol · Migration 0006 · Onboarding sem service_role
-- Função segura (SECURITY DEFINER) que permite a um usuário autenticado criar
-- a sua primeira empresa e se tornar admin dela — sem depender da chave
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
    raise exception 'Usuário não autenticado';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nome da empresa é obrigatório';
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
