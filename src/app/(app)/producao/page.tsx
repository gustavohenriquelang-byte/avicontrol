import type { Metadata } from "next";
import Link from "next/link";
import { Egg, HeartPulse } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoDailyRecords, demoFlocks } from "@/lib/demo";
import { layingRate } from "@/lib/domain/calculations";
import { formatInt, formatPercent, formatDecimal, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Produção" };

type Row = Tables<"daily_records"> & { flockCode: string };

export default async function ProducaoPage() {
  const { org } = await requirePermission("producao", "read");

  let rows: Row[];
  if (isDemoMode()) {
    const codeById = new Map(demoFlocks.map((f) => [f.id, f.code]));
    rows = demoDailyRecords
      .map((r) => ({ ...r, flockCode: codeById.get(r.flock_id) ?? "—" }))
      .sort((a, b) => b.record_date.localeCompare(a.record_date));
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("daily_records")
      .select("*, flocks(code)")
      .eq("organization_id", org.organizationId)
      .order("record_date", { ascending: false })
      .limit(120);
    rows = (data ?? []).map((r) => ({
      ...(r as Tables<"daily_records">),
      flockCode:
        (r as unknown as { flocks: { code: string } | null }).flocks?.code ?? "—",
    }));
  }

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Produção" description="Produção de ovos por dia e por lote." />
        <EmptyState
          icon={Egg}
          title="Sem lançamentos ainda"
          description="Os dados aparecem aqui conforme os lançamentos diários forem registrados."
          action={
            <Link href="/lancamento" className={buttonVariants({ size: "sm" })}>
              Ir para o lançamento
            </Link>
          }
        />
      </>
    );
  }

  // Resumo dos últimos 30 lançamentos.
  const last30 = rows.slice(0, 30);
  const totalEggs = last30.reduce((s, r) => s + r.eggs_total, 0);
  const totalMortality = last30.reduce((s, r) => s + r.mortality, 0);
  const avgLaying =
    last30.reduce((s, r) => {
      const live = Math.max(0, r.birds_start - r.mortality - r.culls);
      return s + (layingRate(r.eggs_total, live) ?? 0);
    }, 0) / last30.length;
  const totalFeed = last30.reduce((s, r) => s + r.feed_kg, 0);

  const summary = [
    { label: "Ovos (últimos 30 lanç.)", value: formatInt(totalEggs) },
    { label: "Postura média", value: formatPercent(avgLaying) },
    { label: "Ração (kg)", value: formatDecimal(totalFeed) },
    { label: "Mortalidade", value: formatInt(totalMortality) },
  ];

  return (
    <>
      <PageHeader
        title="Produção"
        description="Produção de ovos por dia e por lote."
        actions={
          <Link
            href="/producao/mortalidade"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <HeartPulse className="size-4" /> Mortalidade
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-ink-muted">{s.label}</p>
              <p className="text-xl font-semibold tabular-nums text-ink">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead className="text-right">Ovos</TableHead>
              <TableHead className="text-right">Postura</TableHead>
              <TableHead className="text-right">Ração (kg)</TableHead>
              <TableHead className="text-right">Mort.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 60).map((r) => {
              const live = Math.max(0, r.birds_start - r.mortality - r.culls);
              return (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{formatDate(r.record_date)}</TableCell>
                  <TableCell className="font-medium">{r.flockCode}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(r.eggs_total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(layingRate(r.eggs_total, live))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(r.feed_kg)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.mortality}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "closed" ? "success" : "warning"}>
                      {r.status === "closed" ? "Fechado" : "Rascunho"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
