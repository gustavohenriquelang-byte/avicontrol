import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Auditoria" };

const ACTION_LABELS: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Exclusão",
  inactivate: "Inativação",
  reactivate: "Reativação",
  close_daily: "Fechamento diário",
  save_daily_draft: "Rascunho diário",
  feed_purchase: "Compra de ração",
  manure_sale: "Venda de esterco",
  create_user: "Criação de usuário",
  update_user_role: "Alteração de perfil",
};

export default async function AuditoriaPage() {
  const { org } = await requirePermission("configuracoes", "manage");

  interface Log {
    id: string;
    created_at: string;
    action: string;
    table_name: string;
    record_id: string | null;
    user_id: string | null;
    userName: string | null;
  }

  let logs: Log[] = [];
  if (!isDemoMode()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("audit_logs")
      .select("id, created_at, action, table_name, record_id, user_id")
      .eq("organization_id", org.organizationId)
      .order("created_at", { ascending: false })
      .limit(200);

    const ids = [...new Set((data ?? []).map((l) => l.user_id).filter(Boolean))] as string[];
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? p.email]));

    logs = (data ?? []).map((l) => ({
      ...l,
      userName: l.user_id ? nameById.get(l.user_id) ?? null : null,
    }));
  }

  return (
    <>
      <PageHeader title="Auditoria" description="Registro de ações importantes no sistema." />
      {isDemoMode() ? (
        <EmptyState icon={ScrollText} title="Auditoria" description="No modo demonstração não há registros. Em produção, cada criação, alteração e exclusão fica registrada aqui." />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Sem registros ainda" description="As ações realizadas no sistema aparecem aqui." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="tabular-nums text-ink-muted">{formatDateTime(l.created_at)}</TableCell>
                  <TableCell>{l.userName ?? "—"}</TableCell>
                  <TableCell>{ACTION_LABELS[l.action] ?? l.action}</TableCell>
                  <TableCell className="text-ink-muted">{l.table_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
