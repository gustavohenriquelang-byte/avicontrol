"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
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

/**
 * Onboarding: cria a primeira empresa e vincula o usuário como admin.
 * Usa o cliente admin (service role) porque o INSERT em organizations
 * é controlado no servidor (não há política de INSERT para membros).
 */
export async function createFirstOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome da empresa.");

  const user = await requireUser();
  const admin = createAdminClient();

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error("Não foi possível criar a empresa.");

  const { error: linkErr } = await admin.from("organization_users").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "admin",
    active: true,
  });
  if (linkErr) throw new Error("Empresa criada, mas houve erro ao vincular o usuário.");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}
