import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Action, type Module, type Role } from "@/lib/auth/roles";

export const ACTIVE_ORG_COOKIE = "avicontrol.org";

export interface Membership {
  organizationId: string;
  organizationName: string;
  role: Role;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  memberships: Membership[];
  activeOrg: Membership | null;
}

/** Retorna o usuário autenticado ou redireciona para /login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Monta o contexto de sessão: usuário, vínculos com organizações e org ativa
 * (definida por cookie, com fallback para a primeira). Redireciona se não logado.
 */
export async function getSessionContext(): Promise<SessionContext> {
  // Modo demonstração: contexto fictício, sem Supabase.
  const { isDemoMode, demoSession } = await import("@/lib/demo");
  if (isDemoMode()) return demoSession;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("organization_users")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .eq("active", true);

  const memberships: Membership[] = (rows ?? []).map((r) => ({
    organizationId: r.organization_id,
    role: r.role as Role,
    // organizations vem como objeto por causa do relacionamento
    organizationName:
      (r as unknown as { organizations: { name: string } | null }).organizations
        ?.name ?? "Empresa",
  }));

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrg =
    memberships.find((m) => m.organizationId === activeId) ??
    memberships[0] ??
    null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    memberships,
    activeOrg,
  };
}

/**
 * Garante uma organização ativa. Sem vínculos → /onboarding.
 * Sem org selecionada mas com vários vínculos → /selecionar-empresa.
 */
export async function requireActiveOrg(): Promise<{
  ctx: SessionContext;
  org: Membership;
}> {
  const ctx = await getSessionContext();
  if (ctx.memberships.length === 0) redirect("/onboarding");
  if (!ctx.activeOrg) redirect("/selecionar-empresa");
  return { ctx, org: ctx.activeOrg };
}

/**
 * Garante que o usuário tem a permissão (módulo + ação) na org ativa.
 * Uso obrigatório no início de toda server action sensível (item 30).
 */
export async function requirePermission(
  module: Module,
  action: Action = "read"
): Promise<{ ctx: SessionContext; org: Membership }> {
  const { ctx, org } = await requireActiveOrg();
  if (!can(org.role, module, action)) {
    throw new Error(
      `Permissão negada: ${org.role} não pode ${action} em ${module}.`
    );
  }
  return { ctx, org };
}
