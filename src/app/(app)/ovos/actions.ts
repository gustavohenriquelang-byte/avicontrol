"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { eggBatchSchema } from "@/lib/schemas";
import { applyOutflow } from "@/lib/domain/inventory";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  traceCode?: string;
}

/**
 * Gera código de rastreabilidade: OVO-AAAA-MM-DD-Gxx-Lyy-NNN.
 * NNN é um sequencial por dia/granja/lote.
 */
async function buildTraceCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  farmId: string,
  flockId: string | null,
  productionDate: string
): Promise<string> {
  const [{ data: farm }, flockRes] = await Promise.all([
    supabase.from("farms").select("code").eq("id", farmId).maybeSingle(),
    flockId
      ? supabase.from("flocks").select("code").eq("id", flockId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const farmCode = farm?.code ?? "NA";
  const flockCode = (flockRes.data as { code: string } | null)?.code ?? "NA";

  const { count } = await supabase
    .from("egg_inventory")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("farm_id", farmId)
    .eq("production_date", productionDate);

  const seq = String((count ?? 0) + 1).padStart(3, "0");
  return `OVO-${productionDate}-${farmCode}-${flockCode}-${seq}`;
}

export async function registerEggBatch(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("ovos", "write");

  const parsed = eggBatchSchema.safeParse({
    farm_id: formData.get("farm_id"),
    flock_id: formData.get("flock_id"),
    location: formData.get("location"),
    production_date: formData.get("production_date"),
    quality: formData.get("quality"),
    weight_category: formData.get("weight_category"),
    quantity: formData.get("quantity"),
    expiry_date: formData.get("expiry_date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const b = parsed.data;

  const supabase = await createClient();
  const traceCode = await buildTraceCode(
    supabase,
    org.organizationId,
    b.farm_id,
    b.flock_id ?? null,
    b.production_date
  );

  const { data, error } = await supabase
    .from("egg_inventory")
    .insert({
      organization_id: org.organizationId,
      farm_id: b.farm_id,
      flock_id: b.flock_id ?? null,
      location: b.location ?? null,
      production_date: b.production_date,
      quality: b.quality,
      weight_category: b.weight_category ?? null,
      quantity: b.quantity,
      expiry_date: b.expiry_date ?? null,
      trace_code: traceCode,
      notes: b.notes ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar o lote de ovos." };

  await supabase.from("egg_inventory_movements").insert({
    organization_id: org.organizationId,
    egg_inventory_id: data!.id,
    movement_type: "producao",
    movement_date: b.production_date,
    quantity: b.quantity,
    created_by: ctx.userId,
  });

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "insert",
    table: "egg_inventory",
    recordId: data!.id,
    newValue: { trace: traceCode, qty: b.quantity },
  });

  revalidatePath("/ovos");
  return { ok: true, traceCode };
}

/** Saída de estoque de ovos (venda, descarte, transferência, ajuste). */
export async function registerEggOutflow(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("ovos", "write");
  const invId = String(formData.get("egg_inventory_id") ?? "");
  const qty = Number(formData.get("quantity") ?? 0);
  const type = String(formData.get("movement_type") ?? "venda") as
    | "venda"
    | "descarte"
    | "transferencia"
    | "ajuste";
  const date = String(formData.get("movement_date") ?? "");
  if (!invId || !(qty > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Informe lote, quantidade e data válidos." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("egg_inventory")
    .select("id, quantity")
    .eq("id", invId)
    .eq("organization_id", org.organizationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Lote de ovos não encontrado." };

  const next = applyOutflow({ quantity: inv.quantity, avgCost: 0 }, qty);

  await supabase.from("egg_inventory_movements").insert({
    organization_id: org.organizationId,
    egg_inventory_id: invId,
    movement_type: type,
    movement_date: date,
    quantity: -qty,
    created_by: ctx.userId,
  });
  await supabase
    .from("egg_inventory")
    .update({ quantity: next.quantity })
    .eq("id", invId);

  revalidatePath("/ovos");
  return { ok: true };
}
