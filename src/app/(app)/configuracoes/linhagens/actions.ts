"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { breedSchema, breedCurveRowSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveBreed(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("configuracoes", "write");

  const parsed = breedSchema.safeParse({
    name: formData.get("name"),
    supplier: formData.get("supplier"),
    color: formData.get("color"),
    notes: formData.get("notes"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }

  const supabase = await createClient();
  const values = { ...parsed.data, organization_id: org.organizationId };

  if (id) {
    const { error } = await supabase
      .from("breeds")
      .update(values)
      .eq("id", id)
      .eq("organization_id", org.organizationId);
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "update",
      table: "breeds",
      recordId: id,
      newValue: values,
    });
  } else {
    const { data, error } = await supabase
      .from("breeds")
      .insert(values)
      .select("id")
      .single();
    if (error) return { ok: false, error: mapDbError(error.message) };
    await writeAudit({
      organizationId: org.organizationId,
      userId: ctx.userId,
      action: "insert",
      table: "breeds",
      recordId: data?.id,
      newValue: values,
    });
  }

  revalidatePath("/configuracoes/linhagens");
  return { ok: true };
}

export async function toggleBreedActive(id: string, active: boolean) {
  const { org, ctx } = await requirePermission("configuracoes", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("breeds")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: active ? "reactivate" : "inactivate",
    table: "breeds",
    recordId: id,
    newValue: { active },
  });
  revalidatePath("/configuracoes/linhagens");
}

/**
 * Salva a curva completa de uma linhagem. Recebe as linhas como JSON.
 * Estratégia simples: substitui todas as linhas da curva (delete + insert)
 * dentro do escopo da organização e da linhagem.
 */
export async function saveBreedCurve(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const breedId = String(formData.get("breed_id") ?? "");
  const { org, ctx } = await requirePermission("configuracoes", "write");
  if (!breedId) return { ok: false, error: "Linhagem inválida." };

  let rawRows: unknown;
  try {
    rawRows = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return { ok: false, error: "Dados da curva inválidos." };
  }
  if (!Array.isArray(rawRows)) return { ok: false, error: "Dados da curva inválidos." };

  const rows = [];
  const seen = new Set<number>();
  for (const r of rawRows) {
    const parsed = breedCurveRowSchema.safeParse(r);
    if (!parsed.success) continue; // ignora linhas incompletas
    if (seen.has(parsed.data.age_weeks)) {
      return { ok: false, error: "Há semanas de idade duplicadas na curva." };
    }
    seen.add(parsed.data.age_weeks);
    rows.push({
      organization_id: org.organizationId,
      breed_id: breedId,
      age_weeks: parsed.data.age_weeks,
      expected_laying_rate: parsed.data.expected_laying_rate ?? null,
      expected_weight_g: parsed.data.expected_weight_g ?? null,
      expected_feed_g: parsed.data.expected_feed_g ?? null,
    });
  }

  const supabase = await createClient();
  const { error: delErr } = await supabase
    .from("breed_curves")
    .delete()
    .eq("organization_id", org.organizationId)
    .eq("breed_id", breedId);
  if (delErr) return { ok: false, error: "Não foi possível atualizar a curva." };

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("breed_curves").insert(rows);
    if (insErr) return { ok: false, error: "Não foi possível salvar a curva." };
  }

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "update",
    table: "breed_curves",
    recordId: breedId,
    newValue: { count: rows.length },
  });

  revalidatePath(`/configuracoes/linhagens/${breedId}`);
  return { ok: true };
}

function mapDbError(message: string): string {
  if (message.includes("duplicate") || message.includes("unique"))
    return "Já existe uma linhagem com este nome.";
  return "Não foi possível salvar. Tente novamente.";
}
