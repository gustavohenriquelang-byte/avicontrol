"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { farmSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseFarm(formData: FormData) {
  return farmSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    city: formData.get("city"),
    state: formData.get("state"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

export async function saveFarm(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("configuracoes", "write");

  const parsed = parseFarm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }

  const supabase = await createClient();
  const values = { ...parsed.data, organization_id: org.organizationId };

  if (id) {
    const { error } = await supabase
      .from("farms")
      .update(values)
      .eq("id", id)
      .eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "update",
      table: "farms",
      recordId: id,
      newValue: values,
    });
  } else {
    const { data, error } = await supabase
      .from("farms")
      .insert(values)
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "insert",
      table: "farms",
      recordId: data?.id,
      newValue: values,
    });
  }

  revalidatePath("/configuracoes/granjas");
  return { ok: true };
}

/** Inativação (soft) — evita exclusão física (item 9). */
export async function toggleFarmActive(id: string, active: boolean) {
  const { org, ctx } = await requirePermission("configuracoes", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("farms")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "reactivate" : "inactivate",
    table: "farms",
    recordId: id,
    newValue: { active },
  });
  revalidatePath("/configuracoes/granjas");
}

function mapDbError(message: string): string {
  if (message.includes("duplicate") || message.includes("unique")) {
    return "Já existe uma granja com este código.";
  }
  return "Não foi possível salvar. Tente novamente.";
}
