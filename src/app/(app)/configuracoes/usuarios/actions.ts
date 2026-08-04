"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { ROLES } from "@/lib/auth/roles";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  tempPassword?: string;
}

/** Gera uma senha temporária legível. */
function genTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/**
 * Redefine a senha de um membro (admin). Gera uma nova senha temporária e a
 * devolve para o admin entregar à pessoa, que depois troca no próprio perfil.
 */
export async function resetUserPassword(
  userId: string
): Promise<{ ok: boolean; password?: string; error?: string }> {
  const { org, ctx } = await requirePermission("configuracoes", "manage");

  // Segurança: o usuário-alvo precisa pertencer a esta empresa.
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organization_users")
    .select("id")
    .eq("organization_id", org.organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return { ok: false, error: "Usuário não pertence à empresa." };

  const admin = createAdminClient();
  const password = genTempPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: "Não foi possível redefinir a senha." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "reset_password",
    table: "organization_users",
    recordId: userId,
  });

  return { ok: true, password };
}

const createUserSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  role: z.enum(ROLES),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

/**
 * Cria um usuário e o vincula à organização com um perfil.
 * Somente administradores. Usa o admin client (service_role).
 */
export async function createOrgUser(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("configuracoes", "manage");

  const parsed = createUserSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const { full_name, email, role, password } = parsed.data;

  const admin = createAdminClient();

  // Cria o usuário no Auth (já confirmado, para poder entrar direto).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "";
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      return {
        ok: false,
        error:
          "Já existe uma conta com este e-mail. Peça para a pessoa usar 'Esqueci a senha' ou use outro e-mail.",
      };
    }
    return {
      ok: false,
      error: `Não foi possível criar o usuário${msg ? ` (${msg})` : ""}.`,
    };
  }

  const userId = created.user.id;

  // Garante o profile (o gatilho já cria, mas reforçamos o nome).
  await admin
    .from("profiles")
    .upsert({ id: userId, email, full_name }, { onConflict: "id" });

  // Vincula à organização com o perfil escolhido.
  const { error: linkErr } = await admin.from("organization_users").insert({
    organization_id: org.organizationId,
    user_id: userId,
    role,
    active: true,
  });
  if (linkErr) {
    return { ok: false, error: "Usuário criado, mas houve erro ao vincular à empresa." };
  }

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "create_user",
    table: "organization_users",
    recordId: userId,
    newValue: { email, role },
  });

  revalidatePath("/configuracoes/usuarios");
  return { ok: true, tempPassword: password };
}

/** Altera o perfil de acesso de um membro. */
export async function updateOrgUserRole(formData: FormData) {
  const { org, ctx } = await requirePermission("configuracoes", "manage");
  const memberId = String(formData.get("member_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!memberId || !ROLES.includes(role as (typeof ROLES)[number])) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ role: role as (typeof ROLES)[number] })
    .eq("id", memberId)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "update_user_role",
    table: "organization_users",
    recordId: memberId,
    newValue: { role },
  });
  revalidatePath("/configuracoes/usuarios");
}

/** Ativa/desativa o acesso de um membro (sem excluir). */
export async function toggleOrgUserActive(memberId: string, active: boolean) {
  const { org, ctx } = await requirePermission("configuracoes", "manage");
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ active })
    .eq("id", memberId)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "activate_user" : "deactivate_user",
    table: "organization_users",
    recordId: memberId,
    newValue: { active },
  });
  revalidatePath("/configuracoes/usuarios");
}
