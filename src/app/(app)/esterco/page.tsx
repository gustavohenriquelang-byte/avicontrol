import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import {
  isDemoMode,
  demoFarms,
  demoHouses,
  demoManureProduction,
  demoManureSales,
} from "@/lib/demo";
import { MANURE_UNIT_LABELS, type ManureUnit } from "@/lib/domain/inventory";
import { todayISOSaoPaulo, addDaysISO, formatCurrency, formatDecimal, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ManureSaleForm } from "./sale-form";
import { ManureProductionForm } from "./production-form";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Esterco" };

type SaleRow = Tables<"manure_sales"> & { farms: { name: string } | null };

export default async function EstercoPage() {
  const { org } = await requirePermission("esterco", "read");
  const canWrite = can(org.role, "esterco", "write");
  const monthStart = todayISOSaoPaulo().slice(0, 7) + "-01";

  let production: Tables<"manure_production">[];
  let sales: SaleRow[];
  let farms: { id: string; name: string }[];
  let houses: { id: string; name: string }[];

  if (isDemoMode()) {
    production = demoManureProduction;
    sales = demoManureSales;
    farms = demoFarms.map((f) => ({ id: f.id, name: f.name }));
    houses = demoHouses.map((h) => ({ id: h.id, name: h.name }));
  } else {
    const supabase = await createClient();
    const [{ data: prod }, { data: sal }, { data: fa }, { data: ho }] =
      await Promise.all([
        supabase
          .from("manure_production")
          .select("*")
          .eq("organization_id", org.organizationId)
          .order("production_date", { ascending: false })
          .limit(100),
        supabase
          .from("manure_sales")
          .select("*, farms(name)")
          .eq("organization_id", org.organizationId)
          .order("sale_date", { ascending: false })
          .limit(100),
        supabase
          .from("farms")
          .select("id, name")
          .eq("organization_id", org.organizationId)
          .eq("active", true)
          .order("name"),
        supabase
          .from("houses")
          .select("id, name")
          .eq("organization_id", org.organizationId)
          .eq("active", true)
          .order("name"),
      ]);
    production = prod ?? [];
    sales = (sal ?? []) as unknown as SaleRow[];
    farms = fa ?? [];
    houses = ho ?? [];
  }

  const producedKg = production.reduce((s, p) => s + p.quantity_kg, 0);
  const soldKg = sales.reduce((s, v) => s + v.quantity_kg, 0);
  const balanceKg = producedKg - soldKg;
  const revenueMonth = sales
    .filter((s) => s.sale_date >= monthStart)
    .reduce((s, v) => s + v.total, 0);
  const revenueTotal = sales.reduce((s, v) => s + v.total, 0);

  const summary = [
    { label: "Receita do mês", value: formatCurrency(revenueMonth), accent: true },
    { label: "Receita acumulada", value: formatCurrency(revenueTotal) },
    { label: "Produzido (t)", value: formatDecimal(producedKg / 1000) },
    { label: "Saldo em estoque (t)", value: formatDecimal(balanceKg / 1000) },
  ];

  const unitLabel = (u: string) => MANURE_UNIT_LABELS[u as ManureUnit] ?? u;

  return (
    <>
      <PageHeader
        title="Esterco"
        description="Produção, estoque e venda de esterco (cama de aviário) — uma receita da granja."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-ink-muted">{s.label}</p>
              <p
                className={
                  "text-xl font-semibold tabular-nums " +
                  (s.accent ? "text-brand-dark" : "text-ink")
                }
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canWrite && <ManureSaleForm farms={farms} today={todayISOSaoPaulo()} />}

      {sales.length > 0 && (
        <Card>
          <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">
            Vendas de esterco
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço unit.</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="tabular-nums">{formatDate(s.sale_date)}</TableCell>
                  <TableCell className="font-medium">{s.buyer ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(s.quantity)} {unitLabel(s.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(s.unit_price)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-brand-dark">
                    {formatCurrency(s.total)}
                  </TableCell>
                  <TableCell className="text-ink-muted">{s.payment_method ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {canWrite && (
        <ManureProductionForm farms={farms} houses={houses} today={todayISOSaoPaulo()} />
      )}

      {production.length > 0 && (
        <Card>
          <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">
            Produção de esterco
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {production.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="tabular-nums">{formatDate(p.production_date)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDecimal(p.quantity)} {unitLabel(p.unit)}
                  </TableCell>
                  <TableCell className="text-ink-muted">{p.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
