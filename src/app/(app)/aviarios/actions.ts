"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { houseSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveHouse(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("aviarios", "write");

  const parsed = houseSchema.safeParse({
    farm_id: formData.get("farm_id"),
    farm_unit_id: formData.get("farm_unit_id"),
    code: formData.get("code"),
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    installation_type: formData.get("installation_type"),
    housing_system: formData.get("housing_system"),
    area_m2: formData.get("area_m2"),
    cages_count: formData.get("cages_count"),
    status: formData.get("status"),
    notes: formData.get("notes"),
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
      .from("houses")
      .update(values)
      .eq("id", id)
      .eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "update",
      table: "houses",
      recordId: id,
      newValue: values,
    });
  } else {
    const { data, error } = await supabase
      .from("houses")
      .insert(values)
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "insert",
      table: "houses",
      recordId: data?.id,
      newValue: values,
    });
  }

  revalidatePath("/aviarios");
  return { ok: true };
}

export async function toggleHouseActive(id: string, active: boolean) {
  const { org, ctx } = await requirePermission("aviarios", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("houses")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "reactivate" : "inactivate",
    table: "houses",
    recordId: id,
    newValue: { active },
  });
  revalidatePath("/aviarios");
}

function mapDbError(message: string): string {
  if (message.includes("duplicate") || message.includes("unique"))
    return "Já existe um aviário com este código nesta granja.";
  return "Não foi possível salvar. Tente novamente.";
}
