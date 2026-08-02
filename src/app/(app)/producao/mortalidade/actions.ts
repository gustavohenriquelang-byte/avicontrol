"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { mortalitySchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveMortality(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("lancamento", "write");

  const parsed = mortalitySchema.safeParse({
    flock_id: formData.get("flock_id"),
    house_id: formData.get("house_id"),
    record_date: formData.get("record_date"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    cause_note: formData.get("cause_note"),
    responsible: formData.get("responsible"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }

  const supabase = await createClient();
  const values = {
    organization_id: org.organizationId,
    flock_id: parsed.data.flock_id,
    house_id: parsed.data.house_id ?? null,
    record_date: parsed.data.record_date,
    quantity: parsed.data.quantity,
    reason: parsed.data.reason,
    cause_note: parsed.data.cause_note ?? null,
    responsible: parsed.data.responsible ?? null,
    notes: parsed.data.notes ?? null,
    created_by: ctx.userId,
  };

  const { data, error } = await supabase
    .from("mortality_records")
    .insert(values)
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "insert",
    table: "mortality_records",
    recordId: data?.id,
    newValue: values,
  });

  revalidatePath("/producao/mortalidade");
  return { ok: true };
}
