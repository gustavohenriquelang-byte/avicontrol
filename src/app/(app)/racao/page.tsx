import type { Metadata } from "next";
import Link from "next/link";
import { Wheat, Settings2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import {
  isDemoMode,
  demoFeedTypes,
  demoFeedInventory,
  demoFeedMovements,
  demoDailyRecords,
} from "@/lib/demo";
import { daysOfStock } from "@/lib/domain/inventory";
import { todayISOSaoPaulo, formatInt, formatCurrency, formatDecimal, formatDate } from "@/lib/format";
import { FEED_MOVEMENT_LABELS } from "@/lib/schemas";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PurchaseForm } from "./purchase-form";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Ração" };

export default async function RacaoPage() {
  const { org } = await requirePermission("racao", "read");
  const canWrite = can(org.role, "racao", "write");

  let feedTypes: { id: string; name: string }[];
  let inventory: (Tables<"feed_inventory"> & { feed_types: { name: string } | null })[];
  let movements: (Tables<"feed_movements"> & { feed_types: { name: string } | null })[];
  let avgDailyConsumption = 0;

  if (isDemoMode()) {
    feedTypes = demoFeedTypes.map((f) => ({ id: f.id, name: f.name }));
    inventory = demoFeedInventory;
    movements = demoFeedMovements;
    const last7 = demoDailyRecords
      .filter((r) => r.record_date >= addDays(todayISOSaoPaulo(), -7))
      .reduce((s, r) => s + r.feed_kg, 0);
    avgDailyConsumption = last7 / 7;
  } else {
    const supabase = await createClient();
    const [{ data: types }, { data: inv }, { data: mov }, { data: daily }] =
      await Promise.all([
        supabase
          .from("feed_types")
          .select("id, name")
          .eq("organization_id", org.organizationId)
          .eq("active", true)
          .order("name"),
        supabase
          .from("feed_inventory")
          .select("*, feed_types(name)")
          .eq("organization_id", org.organizationId),
        supabase
          .from("feed_movements")
          .select("*, feed_types(name)")
          .eq("organization_id", org.organizationId)
          .order("movement_date", { ascending: false })
          .limit(20),
        supabase
          .from("daily_records")
          .select("feed_kg, record_date")
          .eq("organization_id", org.organizationId)
          .gte("record_date", addDays(todayISOSaoPaulo(), -7)),
      ]);
    feedTypes = types ?? [];
    inventory = (inv ?? []) as unknown as typeof inventory;
    movements = (mov ?? []) as unknown as typeof movements;
    avgDailyConsumption =
      (daily ?? []).reduce((s, r) => s + (r.feed_kg ?? 0), 0) / 7;
  }

  const totalKg = inventory.reduce((s, i) => s + i.quantity_kg, 0);
  const totalValue = inventory.reduce((s, i) => s + i.quantity_kg * i.avg_cost, 0);
  const days = daysOfStock(totalKg, avgDailyConsumption);

  const summary = [
    { label: "Estoque total", value: `${formatInt(totalKg)} kg` },
    { label: "Valor em estoque", value: formatCurrency(totalValue) },
    { label: "Consumo médio/dia", value: `${formatInt(avgDailyConsumption)} kg` },
    { label: "Dias de estoque", value: days == null ? "—" : formatInt(days) },
  ];

  return (
    <>
      <PageHeader
        title="Ração"
        description="Estoque de ração com custo médio ponderado."
        actions={
          canWrite && (
            <Link
              href="/racao/tipos"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Settings2 className="size-4" /> Tipos de ração
            </Link>
          )
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

      {feedTypes.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="Nenhum tipo de ração"
          description="Cadastre os tipos de ração para controlar compras e estoque."
          action={
            canWrite && (
              <Link href="/racao/tipos" className={buttonVariants({ size: "sm" })}>
                Cadastrar tipos
              </Link>
            )
          }
        />
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de ração</TableHead>
                  <TableHead className="text-right">Estoque (kg)</TableHead>
                  <TableHead className="text-right">Custo médio (R$/kg)</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {(i as { feed_types: { name: string } | null }).feed_types?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(i.quantity_kg)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(i.avg_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(i.quantity_kg * i.avg_cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {canWrite && <PurchaseForm feedTypes={feedTypes} today={todayISOSaoPaulo()} />}

          {movements.length > 0 && (
            <Card>
              <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">
                Movimentações recentes
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo de ração</TableHead>
                    <TableHead>Movimento</TableHead>
                    <TableHead className="text-right">Qtd (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="tabular-nums">{formatDate(m.movement_date)}</TableCell>
                      <TableCell>
                        {(m as { feed_types: { name: string } | null }).feed_types?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.quantity_kg >= 0 ? "success" : "neutral"}>
                          {FEED_MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.quantity_kg >= 0 ? "+" : ""}
                        {formatDecimal(m.quantity_kg)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
