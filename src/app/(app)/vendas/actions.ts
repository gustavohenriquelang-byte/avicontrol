"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import type { SalesOrderStatus } from "@/lib/supabase/database.types";

export interface FormResult {
  ok: boolean;
  error?: string;
}

const itemSchema = z.object({
  description: z.string().trim().min(1),
  classification: z.string().trim().optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().default("duzia"),
  unit_price: z.coerce.number().min(0),
});

export async function createOrder(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { org, ctx } = await requirePermission("vendas", "write");

  const customer_id = String(formData.get("customer_id") ?? "") || null;
  const order_date = String(formData.get("order_date") ?? "");
  const status = (String(formData.get("status") ?? "pedido") || "pedido") as SalesOrderStatus;
  const discount = Number(formData.get("discount") ?? 0) || 0;
  const freight = Number(formData.get("freight") ?? 0) || 0;
  const payment_method = String(formData.get("payment_method") ?? "") || null;
  const due_date = String(formData.get("due_date") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(order_date)) return { ok: false, error: "Data inválida." };

  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { ok: false, error: "Itens inválidos." };
  }
  if (!Array.isArray(rawItems)) return { ok: false, error: "Itens inválidos." };

  const items = [];
  for (const r of rawItems) {
    const parsed = itemSchema.safeParse(r);
    if (parsed.success) {
      const total = Math.round(parsed.data.quantity * parsed.data.unit_price * 100) / 100;
      items.push({ ...parsed.data, total });
    }
  }
  if (items.length === 0) return { ok: false, error: "Adicione ao menos um item válido." };

  const subtotal = Math.round(items.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const total = Math.round((subtotal - discount + freight) * 100) / 100;

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("sales_orders")
    .insert({
      organization_id: org.organizationId,
      customer_id,
      order_date,
      status,
      subtotal,
      discount,
      freight,
      total,
      payment_method,
      due_date,
      notes,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error || !order) return { ok: false, error: "Não foi possível criar o pedido." };

  await supabase.from("sales_order_items").insert(
    items.map((i) => ({
      organization_id: org.organizationId,
      order_id: order.id,
      description: i.description,
      classification: i.classification ?? null,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      total: i.total,
    }))
  );

  // Se já nasce faturado, cria a conta a receber.
  if (status === "faturado") {
    await createReceivable(supabase, org.organizationId, order.id, total, due_date, customer_id);
  }

  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "insert", table: "sales_orders", recordId: order.id, newValue: { total, status } });
  revalidatePath("/vendas");
  return { ok: true };
}

async function createReceivable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  orderId: string,
  total: number,
  dueDate: string | null,
  _customerId: string | null
) {
  // Evita duplicar se já existe conta a receber para este pedido.
  const { count } = await supabase
    .from("financial_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("source_type", "sales_order")
    .eq("source_id", orderId);
  if ((count ?? 0) > 0) return;

  await supabase.from("financial_entries").insert({
    organization_id: orgId,
    entry_type: "receita",
    description: "Venda faturada",
    amount: total,
    entry_date: new Date().toISOString().slice(0, 10),
    due_date: dueDate,
    status: "pendente",
    source_type: "sales_order",
    source_id: orderId,
  });
}

export async function updateOrderStatus(id: string, status: SalesOrderStatus) {
  const { org, ctx } = await requirePermission("vendas", "write");
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("sales_orders")
    .select("total, due_date, customer_id")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  const { error } = await supabase.from("sales_orders").update({ status }).eq("id", id).eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);

  // Ao faturar, gera a conta a receber (uma vez).
  if (status === "faturado" && order) {
    await createReceivable(supabase, org.organizationId, id, order.total, order.due_date, order.customer_id);
  }

  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "update_order_status", table: "sales_orders", recordId: id, newValue: { status } });
  revalidatePath("/vendas");
  revalidatePath("/financeiro");
}
