import "server-only";
import { createClient } from "@/lib/supabase/server";

interface AuditEntry {
  organizationId: string | null;
  userId: string | null;
  action: string;
  table: string;
  recordId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/**
 * Registra um evento de auditoria (item 28). Não lança erro para não
 * interromper a operação principal; falhas são apenas logadas.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      organization_id: entry.organizationId,
      user_id: entry.userId,
      action: entry.action,
      table_name: entry.table,
      record_id: entry.recordId ?? null,
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
    });
  } catch (err) {
    console.error("[audit] falha ao registrar log:", err);
  }
}
