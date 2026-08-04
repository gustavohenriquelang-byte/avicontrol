"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { environmentSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerEnvironment(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("ambiente", "write");

  const parsed = environmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("environment_records")
    .insert({
      organization_id: org.organizationId,
      farm_id: d.farm_id ?? null,
      house_id: d.house_id ?? null,
      record_date: d.record_date,
      temp_min: d.temp_min ?? null,
      temp_max: d.temp_max ?? null,
      temp_current: d.temp_current ?? null,
      humidity: d.humidity ?? null,
      ammonia: d.ammonia ?? null,
      co2: d.co2 ?? null,
      luminosity: d.luminosity ?? null,
      light_hours: d.light_hours ?? null,
      ventilation: d.ventilation ?? null,
      notes: d.notes ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "insert",
    table: "environment_records",
    recordId: data?.id,
  });

  revalidatePath("/ambiente");
  return { ok: true };
}
