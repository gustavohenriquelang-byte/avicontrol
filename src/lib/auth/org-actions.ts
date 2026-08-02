"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/lib/auth/context";

/** Define a organização ativa (valida vínculo) e volta para a raiz. */
export async function setActiveOrg(formData: FormData) {
  const orgId = String(formData.get("organizationId") ?? "");
  const user = await requireUser();

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .eq("active", true)
    .maybeSingle();

  if (!data) {
    throw new Error("Você não pertence a esta empresa.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}

export interface OnboardingResult {
  ok: boolean;
  error?: string;
}

/**
 * Onboarding: cria a primeira empresa e vincula o usuário como admin.
 * Usa a função segura `create_org_and_join` no banco (SECURITY DEFINER),
 * chamada com a sessão do próprio usuário — não depende da chave service_role.
 */
export async function createFirstOrganization(
  _prev: OnboardingResult,
  formData: FormData
): Promise<OnboardingResult> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Informe o nome da empresa." };

  await requireUser();
  const supabase = await createClient();

  const { data: orgId, error } = await supabase.rpc("create_org_and_join", {
    p_name: name,
  });
  if (error || !orgId) {
    return { ok: false, error: "Não foi possível criar a empresa. Tente novamente." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId as string, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}
