import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { checkClose } from "@/lib/domain/daily";
import { can, type Role } from "@/lib/auth/roles";
import type { DailyInputSchema } from "@/lib/schemas";

export interface DailyResult {
  ok: boolean;
  error?: string;
  difference?: number;
  status?: "draft" | "closed";
}

/**
 * Lógica central de persistência do lançamento diário — usada tanto pela
 * server action quanto pela rota /api/daily (usada na sincronização offline).
 */
export async function persistDaily(opts: {
  orgId: string;
  userId: string;
  role: Role;
  recordId?: string;
  intent: "draft" | "close";
  d: DailyInputSchema;
}): Promise<DailyResult> {
  const { orgId, userId, role, recordId, intent, d } = opts;
  const close = intent === "close";
  const check = checkClose(d);

  if (close && !check.balanced) {
    const authorized = can(role, "lancamento", "manage") || can(role, "configuracoes", "write");
    if (!authorized || !d.adjustment_justification) {
      return {
        ok: false,
        difference: check.difference,
        error: authorized
          ? `A soma das classificações não fecha (diferença de ${check.difference}). Justifique o ajuste para fechar.`
          : `A soma das classificações não fecha (diferença de ${check.difference}). Corrija antes de fechar.`,
      };
    }
  }

  const supabase = await createClient();
  const values = {
    organization_id: orgId,
    farm_id: d.farm_id,
    house_id: d.house_id ?? null,
    flock_id: d.flock_id,
    record_date: d.record_date,
    collection_time: d.collection_time ?? null,
    birds_start: d.birds_start,
    eggs_total: d.eggs_total,
    eggs_good: d.eggs_good,
    eggs_dirty: d.eggs_dirty,
    eggs_cracked: d.eggs_cracked,
    eggs_broken: d.eggs_broken,
    eggs_deformed: d.eggs_deformed,
    eggs_double_yolk: d.eggs_double_yolk,
    eggs_industrial: d.eggs_industrial,
    eggs_discarded: d.eggs_discarded,
    feed_kg: d.feed_kg,
    water_l: d.water_l,
    mortality: d.mortality,
    culls: d.culls,
    temp_min: d.temp_min ?? null,
    temp_max: d.temp_max ?? null,
    humidity: d.humidity ?? null,
    notes: d.notes ?? null,
    status: (close ? "closed" : "draft") as "closed" | "draft",
    adjustment_justification: d.adjustment_justification ?? null,
    ...(close ? { closed_by: userId, closed_at: new Date().toISOString() } : {}),
  };

  let savedId = recordId ?? "";
  if (recordId) {
    const { error } = await supabase
      .from("daily_records")
      .update(values)
      .eq("id", recordId)
      .eq("organization_id", orgId);
    if (error) return { ok: false, error: mapDbError(error.message) };
  } else {
    const { data, error } = await supabase
      .from("daily_records")
      .insert({ ...values, created_by: userId })
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error.message) };
    savedId = data?.id ?? "";
  }

  await writeAudit({
    organizationId: orgId,
    userId,
    action: close ? "close_daily" : "save_daily_draft",
    table: "daily_records",
    recordId: savedId,
    newValue: { flock: d.flock_id, date: d.record_date, status: values.status },
  });

  revalidatePath("/lancamento");
  revalidatePath("/producao");
  revalidatePath("/");
  return { ok: true, status: values.status };
}

function mapDbError(message: string): string {
  if (message.includes("uq_daily_closed") || message.includes("duplicate")) {
    return "Já existe um lançamento fechado para este lote nesta data.";
  }
  return "Não foi possível salvar. Tente novamente.";
}
