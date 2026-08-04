import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoWeighings, demoFlocks } from "@/lib/demo";
import { todayISOSaoPaulo, formatDecimal, formatPercent, formatInt, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WeighingForm } from "./weighing-form";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Pesagens" };

type Row = Tables<"bird_weights"> & { flocks: { code: string } | null };

export default async function PesagensPage() {
  const { org } = await requirePermission("pesagens", "read");
  const canWrite = can(org.role, "pesagens", "write");

  let weighings: Row[];
  let flocks: { id: string; code: string }[];

  if (isDemoMode()) {
    weighings = demoWeighings;
    flocks = demoFlocks.map((f) => ({ id: f.id, code: f.code }));
  } else {
    const supabase = await createClient();
    const [{ data: w }, { data: fl }] = await Promise.all([
      supabase
        .from("bird_weights")
        .select("*, flocks(code)")
        .eq("organization_id", org.organizationId)
        .order("weigh_date", { ascending: false })
        .limit(100),
      supabase
        .from("flocks")
        .select("id, code")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("code"),
    ]);
    weighings = (w ?? []) as unknown as Row[];
    flocks = fl ?? [];
  }

  return (
    <>
      <PageHeader
        title="Pesagens"
        description="Peso médio, uniformidade e comparação com a curva esperada."
      />

      {canWrite && flocks.length > 0 && (
        <WeighingForm flocks={flocks} today={todayISOSaoPaulo()} />
      )}

      {weighings.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Nenhuma pesagem registrada"
          description="Registre uma pesagem colando os pesos individuais — o sistema calcula média, desvio, CV e uniformidade."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Idade</TableHead>
                <TableHead className="text-right">Média (g)</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">CV</TableHead>
                <TableHead className="text-right">Uniformidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weighings.map((w) => {
                const rel = w as Row;
                const diff =
                  w.mean_g != null && w.expected_g != null
                    ? w.mean_g - w.expected_g
                    : null;
                return (
                  <TableRow key={w.id}>
                    <TableCell className="tabular-nums">{formatDate(w.weigh_date)}</TableCell>
                    <TableCell className="font-medium">{rel.flocks?.code ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {w.age_days ? `${w.age_days}d` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDecimal(w.mean_g)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink-muted">
                      {w.expected_g == null ? "—" : formatDecimal(w.expected_g)}
                      {diff != null && (
                        <span
                          className={
                            "ml-1 text-xs " +
                            (diff >= 0 ? "text-brand" : "text-destructive")
                          }
                        >
                          ({diff >= 0 ? "+" : ""}
                          {formatInt(diff)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(w.cv)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          (w.uniformity ?? 0) >= 80
                            ? "success"
                            : (w.uniformity ?? 0) >= 70
                              ? "warning"
                              : "danger"
                        }
                      >
                        {formatPercent(w.uniformity)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
