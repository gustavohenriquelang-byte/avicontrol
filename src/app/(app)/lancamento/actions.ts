"use server";

import { requirePermission } from "@/lib/auth/context";
import { dailySchema } from "@/lib/schemas";
import { persistDaily, type DailyResult } from "@/lib/daily-save";

export type { DailyResult };

export async function saveDaily(
  _prev: DailyResult,
  formData: FormData
): Promise<DailyResult> {
  const intent = String(formData.get("intent") ?? "draft") === "close" ? "close" : "draft";
  const recordId = String(formData.get("record_id") ?? "");
  const { org, ctx } = await requirePermission("lancamento", "write");

  const parsed = dailySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  return persistDaily({
    orgId: org.organizationId,
    userId: ctx.userId,
    role: org.role,
    recordId,
    intent,
    d: parsed.data,
  });
}
