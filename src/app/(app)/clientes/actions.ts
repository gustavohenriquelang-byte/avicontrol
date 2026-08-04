"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { customerSchema } from "@/lib/schemas";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveCustomer(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("clientes", "write");

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    doc: formData.get("doc"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    credit_limit: formData.get("credit_limit"),
    notes: formData.get("notes"),
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors: fe };
  }

  const supabase = await createClient();
  const values = {
    ...parsed.data,
    credit_limit: parsed.data.credit_limit ?? 0,
    email: parsed.data.email ?? null,
    organization_id: org.organizationId,
  };

  const res = id
    ? await supabase.from("customers").update(values).eq("id", id).eq("organization_id", org.organizationId)
    : await supabase.from("customers").insert(values);
  if (res.error) return { ok: false, error: "Não foi possível salvar o cliente." };

  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: id ? "update" : "insert", table: "customers", recordId: id || undefined });
  revalidatePath("/clientes");
  return { ok: true };
}

export async function toggleCustomerActive(id: string, active: boolean) {
  const { org } = await requirePermission("clientes", "write");
  const supabase = await createClient();
  await supabase.from("customers").update({ active }).eq("id", id).eq("organization_id", org.organizationId);
  revalidatePath("/clientes");
}
