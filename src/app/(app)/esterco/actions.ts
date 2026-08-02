"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { manureProductionSchema, manureSaleSchema } from "@/lib/schemas";
import { manureToKg, manureSaleTotal } from "@/lib/domain/inventory";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Registra produção/retirada de esterco (entrada no estoque). */
export async function registerManureProduction(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("esterco", "write");

  const parsed = manureProductionSchema.safeParse({
    farm_id: formData.get("farm_id"),
    house_id: formData.get("house_id"),
    flock_id: formData.get("flock_id"),
    production_date: formData.get("production_date"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const p = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manure_production")
    .insert({
      organization_id: org.organizationId,
      farm_id: p.farm_id ?? null,
      house_id: p.house_id ?? null,
      flock_id: p.flock_id ?? null,
      production_date: p.production_date,
      quantity: p.quantity,
      unit: p.unit,
      quantity_kg: manureToKg(p.quantity, p.unit),
      notes: p.notes ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar a produção." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "insert",
    table: "manure_production",
    recordId: data?.id,
    newValue: { qty: p.quantity, unit: p.unit },
  });

  revalidatePath("/esterco");
  return { ok: true };
}

/** Registra uma venda de esterco (receita). */
export async function registerManureSale(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("esterco", "write");

  const parsed = manureSaleSchema.safeParse({
    farm_id: formData.get("farm_id"),
    sale_date: formData.get("sale_date"),
    buyer: formData.get("buyer"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    unit_price: formData.get("unit_price"),
    payment_method: formData.get("payment_method"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const s = parsed.data;
  const total = manureSaleTotal(s.quantity, s.unit_price);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("manure_sales")
    .insert({
      organization_id: org.organizationId,
      farm_id: s.farm_id ?? null,
      sale_date: s.sale_date,
      buyer: s.buyer ?? null,
      quantity: s.quantity,
      unit: s.unit,
      quantity_kg: manureToKg(s.quantity, s.unit),
      unit_price: s.unit_price,
      total,
      payment_method: s.payment_method ?? null,
      notes: s.notes ?? null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar a venda." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "manure_sale",
    table: "manure_sales",
    recordId: data?.id,
    newValue: { qty: s.quantity, unit: s.unit, total },
  });

  revalidatePath("/esterco");
  return { ok: true };
}
