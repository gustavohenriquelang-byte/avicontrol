"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

const orgSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  legal_name: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  city: z.string().trim().optional(),
  state: z.string().trim().max(2).optional(),
  timezone: z.string().trim().default("America/Sao_Paulo"),
});

export interface FormResult {
  ok: boolean;
  error?: string;
}

export async function saveOrganization(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("configuracoes", "write");

  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    city: formData.get("city"),
    state: formData.get("state"),
    timezone: formData.get("timezone") || "America/Sao_Paulo",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const values = {
    ...parsed.data,
    email: parsed.data.email || null,
  };
  const { error } = await supabase
    .from("organizations")
    .update(values)
    .eq("id", org.organizationId);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "update",
    table: "organizations",
    recordId: org.organizationId,
    newValue: values,
  });

  revalidatePath("/configuracoes/empresa");
  return { ok: true };
}
