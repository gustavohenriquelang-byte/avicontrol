import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoFlocks } from "@/lib/demo";
import { MORTALITY_REASON_LABELS } from "@/lib/schemas";
import { todayISOSaoPaulo, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HeartPulse } from "lucide-react";
import { MortalityForm } from "./mortality-form";

export const metadata: Metadata = { title: "Mortalidade" };

export default async function MortalidadePage() {
  const { org } = await requirePermission("producao", "read");
  const canWrite = can(org.role, "lancamento", "write");

  const flocks = isDemoMode()
    ? demoFlocks.map((f) => ({ id: f.id, code: f.code }))
    : ((
        await (await createClient())
          .from("flocks")
          .select("id, code")
          .eq("organization_id", org.organizationId)
          .eq("active", true)
          .order("code")
      ).data ?? []);

  // Histórico (vazio em demo — mortality_records não é gerado no seed demo).
  let history: {
    id: string;
    record_date: string;
    quantity: number;
    reason: string;
    flockCode: string;
  }[] = [];

  if (!isDemoMode()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("mortality_records")
      .select("id, record_date, quantity, reason, flocks(code)")
      .eq("organization_id", org.organizationId)
      .order("record_date", { ascending: false })
      .limit(50);
    history = (data ?? []).map((r) => ({
      id: r.id,
      record_date: r.record_date,
      quantity: r.quantity,
      reason: r.reason,
      flockCode:
        (r as unknown as { flocks: { code: string } | null }).flocks?.code ?? "—",
    }));
  }

  return (
    <>
      <PageHeader
        title="Mortalidade"
        description="Registro e histórico de mortalidade por lote e motivo."
      />

      {canWrite && <MortalityForm flocks={flocks} today={todayISOSaoPaulo()} />}

      {history.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="Sem registros detalhados"
          description="Os registros de mortalidade aparecem aqui. No modo demonstração, a mortalidade diária consta nos lançamentos de produção."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="tabular-nums">{formatDate(h.record_date)}</TableCell>
                  <TableCell className="font-medium">{h.flockCode}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.quantity}</TableCell>
                  <TableCell className="text-ink-muted">
                    {MORTALITY_REASON_LABELS[h.reason] ?? h.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
