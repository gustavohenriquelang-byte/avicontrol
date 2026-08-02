"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { flockSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveFlock(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("lotes", "write");

  const parsed = flockSchema.safeParse({
    farm_id: formData.get("farm_id"),
    house_id: formData.get("house_id"),
    breed_id: formData.get("breed_id"),
    code: formData.get("code"),
    supplier: formData.get("supplier"),
    birth_date: formData.get("birth_date"),
    housing_date: formData.get("housing_date"),
    initial_quantity: formData.get("initial_quantity"),
    current_quantity: formData.get("current_quantity"),
    age_at_housing_days: formData.get("age_at_housing_days"),
    acquisition_cost: formData.get("acquisition_cost"),
    initial_avg_weight_g: formData.get("initial_avg_weight_g"),
    expected_laying_start: formData.get("expected_laying_start"),
    expected_cull_date: formData.get("expected_cull_date"),
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
  const d = parsed.data;

  // Na criação, se current_quantity não informado, assume initial_quantity.
  const initial = d.initial_quantity ?? 0;
  const current = d.current_quantity ?? initial;

  const values = {
    ...d,
    initial_quantity: initial,
    current_quantity: current,
    organization_id: org.organizationId,
  };

  if (id) {
    const { error } = await supabase
      .from("flocks")
      .update(values)
      .eq("id", id)
      .eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "update",
      table: "flocks",
      recordId: id,
      newValue: values,
    });
  } else {
    const { data, error } = await supabase
      .from("flocks")
      .insert(values)
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error.message) };

    // Registra a movimentação de entrada (item 11).
    if (data?.id && initial > 0) {
      await supabase.from("flock_movements").insert({
        organization_id: org.organizationId,
        flock_id: data.id,
        movement_type: "entrada",
        quantity: initial,
        reason: "Alojamento inicial",
        created_by: ctx.userId,
      });
    }
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "insert",
      table: "flocks",
      recordId: data?.id,
      newValue: values,
    });
  }

  revalidatePath("/lotes");
  return { ok: true };
}

export async function toggleFlockActive(id: string, active: boolean) {
  const { org, ctx } = await requirePermission("lotes", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("flocks")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "reactivate" : "inactivate",
    table: "flocks",
    recordId: id,
    newValue: { active },
  });
  revalidatePath("/lotes");
}

function mapDbError(message: string): string {
  if (message.includes("duplicate") || message.includes("unique"))
    return "Já existe um lote com este código nesta granja.";
  return "Não foi possível salvar. Tente novamente.";
}
