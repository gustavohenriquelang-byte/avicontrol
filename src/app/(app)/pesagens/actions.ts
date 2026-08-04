"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { weighingSchema, parseWeights } from "@/lib/schemas";
import { weightSampleStats } from "@/lib/domain/calculations";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerWeighing(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("pesagens", "write");

  const parsed = weighingSchema.safeParse({
    flock_id: formData.get("flock_id"),
    weigh_date: formData.get("weigh_date"),
    age_days: formData.get("age_days"),
    weights: formData.get("weights"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const d = parsed.data;
  const weights = parseWeights(d.weights);
  if (weights.length === 0) {
    return { ok: false, error: "Informe ao menos um peso válido.", fieldErrors: { weights: "Pesos inválidos" } };
  }
  const stats = weightSampleStats(weights);

  const supabase = await createClient();

  // Peso esperado da curva da linhagem (se houver), pela idade em semanas.
  let expected: number | null = null;
  if (d.age_days) {
    const ageWeeks = Math.round(d.age_days / 7);
    const { data: flock } = await supabase
      .from("flocks")
      .select("breed_id")
      .eq("id", d.flock_id)
      .maybeSingle();
    if (flock?.breed_id) {
      const { data: curve } = await supabase
        .from("breed_curves")
        .select("expected_weight_g")
        .eq("breed_id", flock.breed_id)
        .eq("age_weeks", ageWeeks)
        .maybeSingle();
      expected = curve?.expected_weight_g ?? null;
    }
  }

  const { data, error } = await supabase
    .from("bird_weights")
    .insert({
      organization_id: org.organizationId,
      flock_id: d.flock_id,
      weigh_date: d.weigh_date,
      age_days: d.age_days ?? null,
      sample_size: stats.count,
      mean_g: stats.mean,
      min_g: stats.min,
      max_g: stats.max,
      std_dev: stats.stdDev,
      cv: stats.cv,
      uniformity: stats.uniformity,
      expected_g: expected,
      samples: weights,
      notes: d.notes ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível salvar a pesagem." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "insert",
    table: "bird_weights",
    recordId: data?.id,
    newValue: { flock: d.flock_id, mean: stats.mean, uniformity: stats.uniformity },
  });

  revalidatePath("/pesagens");
  return { ok: true };
}
