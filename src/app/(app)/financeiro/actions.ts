"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import {
  financialEntrySchema,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_REVENUE_CATEGORIES,
} from "@/lib/schemas";
import { todayISOSaoPaulo } from "@/lib/format";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function addFinancialEntry(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("financeiro", "write");

  const parsed = financialEntrySchema.safeParse({
    entry_type: formData.get("entry_type"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    entry_date: formData.get("entry_date"),
    due_date: formData.get("due_date"),
    status: formData.get("status"),
    cost_center: formData.get("cost_center"),
    farm_id: formData.get("farm_id"),
    payment_method: formData.get("payment_method"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors: fe };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("financial_entries").insert({
    organization_id: org.organizationId,
    entry_type: d.entry_type,
    category_id: d.category_id ?? null,
    description: d.description,
    amount: d.amount,
    entry_date: d.entry_date,
    due_date: d.due_date || null,
    status: d.status,
    paid_date: d.status === "pago" ? d.entry_date : null,
    cost_center: d.cost_center ?? null,
    farm_id: d.farm_id ?? null,
    payment_method: d.payment_method ?? null,
    created_by: ctx.userId,
  });
  if (error) return { ok: false, error: "Não foi possível salvar o lançamento." };

  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "insert", table: "financial_entries", newValue: { type: d.entry_type, amount: d.amount } });
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function markEntryPaid(id: string) {
  const { org, ctx } = await requirePermission("financeiro", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_entries")
    .update({ status: "pago", paid_date: todayISOSaoPaulo() })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "mark_paid", table: "financial_entries", recordId: id });
  revalidatePath("/financeiro");
}

/** Cria as categorias padrão (item 21) se ainda não existirem. */
export async function seedDefaultCategories() {
  const { org, ctx } = await requirePermission("financeiro", "write");
  const supabase = await createClient();

  const rows = [
    ...DEFAULT_REVENUE_CATEGORIES.map((name) => ({ organization_id: org.organizationId, name, kind: "receita" as const })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ organization_id: org.organizationId, name, kind: "despesa" as const })),
  ];
  // onConflict evita duplicar (unique org,name,kind).
  await supabase.from("financial_categories").upsert(rows, { onConflict: "organization_id,name,kind", ignoreDuplicates: true });
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "seed_categories", table: "financial_categories" });
  revalidatePath("/financeiro");
}
