"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { feedTypeSchema, feedPurchaseSchema } from "@/lib/schemas";
import { weightedAverageCost, applyOutflow } from "@/lib/domain/inventory";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveFeedType(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("racao", "write");

  const parsed = feedTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }

  const supabase = await createClient();
  const values = { ...parsed.data, organization_id: org.organizationId };

  if (id) {
    const { error } = await supabase
      .from("feed_types")
      .update(values)
      .eq("id", id)
      .eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: dbErr(error.message) };
  } else {
    const { data, error } = await supabase
      .from("feed_types")
      .insert(values)
      .select("id")
      .single();
    if (error) return { ok: false, error: dbErr(error.message) };
    // Cria a linha de estoque zerada.
    await supabase
      .from("feed_inventory")
      .insert({ organization_id: org.organizationId, feed_type_id: data!.id })
      .select("id")
      .maybeSingle();
  }

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: id ? "update" : "insert",
    table: "feed_types",
    recordId: id || undefined,
    newValue: values,
  });
  revalidatePath("/racao");
  revalidatePath("/racao/tipos");
  return { ok: true };
}

export async function toggleFeedTypeActive(id: string, active: boolean) {
  const { org, ctx } = await requirePermission("racao", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("feed_types")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "reactivate" : "inactivate",
    table: "feed_types",
    recordId: id,
    newValue: { active },
  });
  revalidatePath("/racao/tipos");
  revalidatePath("/racao");
}

/** Registra uma compra e atualiza o estoque com custo médio ponderado. */
export async function registerFeedPurchase(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("racao", "write");

  const parsed = feedPurchaseSchema.safeParse({
    feed_type_id: formData.get("feed_type_id"),
    farm_id: formData.get("farm_id"),
    purchase_date: formData.get("purchase_date"),
    supplier: formData.get("supplier"),
    quantity_kg: formData.get("quantity_kg"),
    unit_cost: formData.get("unit_cost"),
    invoice: formData.get("invoice"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const p = parsed.data;
  const total = Math.round(p.quantity_kg * p.unit_cost * 100) / 100;

  const supabase = await createClient();

  // Registra a compra.
  const { error: purErr } = await supabase.from("feed_purchases").insert({
    organization_id: org.organizationId,
    feed_type_id: p.feed_type_id,
    farm_id: p.farm_id ?? null,
    purchase_date: p.purchase_date,
    supplier: p.supplier ?? null,
    quantity_kg: p.quantity_kg,
    unit_cost: p.unit_cost,
    total_cost: total,
    invoice: p.invoice ?? null,
    notes: p.notes ?? null,
    created_by: ctx.userId,
  });
  if (purErr) return { ok: false, error: "Não foi possível registrar a compra." };

  // Movimentação de entrada.
  await supabase.from("feed_movements").insert({
    organization_id: org.organizationId,
    feed_type_id: p.feed_type_id,
    farm_id: p.farm_id ?? null,
    movement_type: "compra",
    movement_date: p.purchase_date,
    quantity_kg: p.quantity_kg,
    unit_cost: p.unit_cost,
    reference: p.invoice ?? null,
    created_by: ctx.userId,
  });

  // Atualiza o estoque (custo médio ponderado).
  const { data: inv } = await supabase
    .from("feed_inventory")
    .select("id, quantity_kg, avg_cost")
    .eq("organization_id", org.organizationId)
    .eq("feed_type_id", p.feed_type_id)
    .maybeSingle();

  const next = weightedAverageCost(
    { quantity: inv?.quantity_kg ?? 0, avgCost: inv?.avg_cost ?? 0 },
    p.quantity_kg,
    p.unit_cost
  );

  if (inv) {
    await supabase
      .from("feed_inventory")
      .update({ quantity_kg: next.quantity, avg_cost: next.avgCost })
      .eq("id", inv.id);
  } else {
    await supabase.from("feed_inventory").insert({
      organization_id: org.organizationId,
      feed_type_id: p.feed_type_id,
      quantity_kg: next.quantity,
      avg_cost: next.avgCost,
    });
  }

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "feed_purchase",
    table: "feed_purchases",
    newValue: { feed_type: p.feed_type_id, qty: p.quantity_kg, total },
  });

  revalidatePath("/racao");
  return { ok: true };
}

/** Baixa de estoque por consumo/perda (mantém o custo médio). */
export async function registerFeedOutflow(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("racao", "write");
  const feedTypeId = String(formData.get("feed_type_id") ?? "");
  const qty = Number(formData.get("quantity_kg") ?? 0);
  const type = String(formData.get("movement_type") ?? "consumo") as
    | "consumo"
    | "perda"
    | "ajuste";
  const date = String(formData.get("movement_date") ?? "");
  if (!feedTypeId || !(qty > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Informe tipo, quantidade e data válidos." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("feed_inventory")
    .select("id, quantity_kg, avg_cost")
    .eq("organization_id", org.organizationId)
    .eq("feed_type_id", feedTypeId)
    .maybeSingle();

  const next = applyOutflow(
    { quantity: inv?.quantity_kg ?? 0, avgCost: inv?.avg_cost ?? 0 },
    qty
  );

  await supabase.from("feed_movements").insert({
    organization_id: org.organizationId,
    feed_type_id: feedTypeId,
    movement_type: type,
    movement_date: date,
    quantity_kg: -qty,
    unit_cost: inv?.avg_cost ?? null,
    created_by: ctx.userId,
  });

  if (inv) {
    await supabase
      .from("feed_inventory")
      .update({ quantity_kg: next.quantity })
      .eq("id", inv.id);
  }

  revalidatePath("/racao");
  return { ok: true };
}

function dbErr(message: string): string {
  if (message.includes("duplicate") || message.includes("unique"))
    return "Já existe um tipo de ração com este nome.";
  return "Não foi possível salvar. Tente novamente.";
}
