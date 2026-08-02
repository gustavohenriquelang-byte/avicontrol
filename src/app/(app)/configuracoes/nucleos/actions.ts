"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { farmUnitSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveFarmUnit(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("configuracoes", "write");

  const parsed = farmUnitSchema.safeParse({
    farm_id: formData.get("farm_id"),
    code: formData.get("code"),
    name: formData.get("name"),
    notes: formData.get("notes"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }

  const supabase = await createClient();
  const values = { ...parsed.data, organization_id: org.organizationId };

  if (id) {
    const { error } = await supabase
      .from("farm_units")
      .update(values)
      .eq("id", id)
      .eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "update",
      table: "farm_units",
      recordId: id,
      newValue: values,
    });
  } else {
    const { data, error } = await supabase
      .from("farm_units")
      .insert(values)
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "insert",
      table: "farm_units",
      recordId: data?.id,
      newValue: values,
    });
  }

  revalidatePath("/configuracoes/nucleos");
  return { ok: true };
}

export async function toggleFarmUnitActive(id: string, active: boolean) {
  const { org, ctx } = await requirePermission("configuracoes", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("farm_units")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "reactivate" : "inactivate",
    table: "farm_units",
    recordId: id,
    newValue: { active },
  });
  revalidatePath("/configuracoes/nucleos");
}

function mapDbError(message: string): string {
  if (message.includes("duplicate") || message.includes("unique"))
    return "Já existe um núcleo com este código nesta granja.";
  return "Não foi possível salvar. Tente novamente.";
}
