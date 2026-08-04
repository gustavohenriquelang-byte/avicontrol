import type { Metadata } from "next";
import { Egg } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import {
  isDemoMode,
  demoEggInventory,
  demoFarms,
  demoFlocks,
  demoDailyRecords,
} from "@/lib/demo";
import { EGG_QUALITY_LABELS } from "@/lib/schemas";
import { convertEggs } from "@/lib/domain/inventory";
import { todayISOSaoPaulo, formatInt, formatDecimal, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BatchForm } from "./batch-form";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Ovos" };

type Row = Tables<"egg_inventory"> & {
  farms: { name: string } | null;
  flocks: { code: string } | null;
};

export default async function OvosPage() {
  const { org } = await requirePermission("ovos", "read");
  const canWrite = can(org.role, "ovos", "write");

  let inventory: Row[];
  let farms: { id: string; name: string }[];
  let flocks: { id: string; name: string }[];
  let collections: {
    id: string;
    record_date: string;
    flockCode: string;
    eggs_total: number;
    commercial: number;
    losses: number;
  }[];

  const mapCollection = (r: {
    id: string;
    record_date: string;
    eggs_total: number;
    eggs_good: number;
    eggs_dirty: number;
    eggs_cracked: number;
    eggs_broken: number;
    eggs_deformed: number;
    eggs_discarded: number;
    flockCode: string;
  }) => ({
    id: r.id,
    record_date: r.record_date,
    flockCode: r.flockCode,
    eggs_total: r.eggs_total,
    commercial: r.eggs_good + r.eggs_dirty,
    losses: r.eggs_cracked + r.eggs_broken + r.eggs_deformed + r.eggs_discarded,
  });

  if (isDemoMode()) {
    inventory = demoEggInventory;
    farms = demoFarms.map((f) => ({ id: f.id, name: f.name }));
    flocks = demoFlocks.map((f) => ({ id: f.id, name: f.code }));
    const codeById = new Map(demoFlocks.map((f) => [f.id, f.code]));
    collections = [...demoDailyRecords]
      .sort((a, b) => b.record_date.localeCompare(a.record_date))
      .slice(0, 20)
      .map((r) => mapCollection({ ...r, flockCode: codeById.get(r.flock_id) ?? "—" }));
  } else {
    const supabase = await createClient();
    const [{ data: inv }, { data: fa }, { data: fl }] = await Promise.all([
      supabase
        .from("egg_inventory")
        .select("*, farms(name), flocks(code)")
        .eq("organization_id", org.organizationId)
        .gt("quantity", 0)
        .order("production_date", { ascending: false })
        .limit(100),
      supabase
        .from("farms")
        .select("id, name")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("flocks")
        .select("id, code")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("code"),
    ]);
    inventory = (inv ?? []) as unknown as Row[];
    farms = fa ?? [];
    flocks = (fl ?? []).map((f) => ({ id: f.id, name: f.code }));

    const { data: daily } = await supabase
      .from("daily_records")
      .select(
        "id, record_date, eggs_total, eggs_good, eggs_dirty, eggs_cracked, eggs_broken, eggs_deformed, eggs_discarded, flocks(code)"
      )
      .eq("organization_id", org.organizationId)
      .order("record_date", { ascending: false })
      .limit(20);
    collections = (daily ?? []).map((r) =>
      mapCollection({
        ...(r as unknown as Parameters<typeof mapCollection>[0]),
        flockCode:
          (r as unknown as { flocks: { code: string } | null }).flocks?.code ?? "—",
      })
    );
  }

  const totalUnits = inventory.reduce((s, i) => s + i.quantity, 0);
  const conv = convertEggs(totalUnits);

  const summary = [
    { label: "Ovos em estoque", value: formatInt(totalUnits) },
    { label: "Dúzias", value: formatDecimal(conv.dozens) },
    { label: "Bandejas", value: formatDecimal(conv.trays) },
    { label: "Caixas", value: formatDecimal(conv.boxes) },
  ];

  return (
    <>
      <PageHeader
        title="Ovos"
        description="Estoque de ovos com classificação e rastreabilidade."
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

      {/* Histórico diário de ovos coletados (vem do lançamento diário) */}
      {collections.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="text-sm font-semibold text-ink">
              Coletas diárias (últimos lançamentos)
            </span>
            <span className="text-xs text-ink-muted">
              origem: lançamento diário
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Coletados</TableHead>
                <TableHead className="text-right">Comerciais</TableHead>
                <TableHead className="text-right">Perdas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular-nums">{formatDate(c.record_date)}</TableCell>
                  <TableCell className="font-medium">{c.flockCode}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(c.eggs_total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-brand-dark">
                    {formatInt(c.commercial)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-ink-muted">
                    {formatInt(c.losses)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {canWrite && <BatchForm farms={farms} flocks={flocks} today={todayISOSaoPaulo()} />}

      {inventory.length === 0 ? (
        <EmptyState
          icon={Egg}
          title="Sem ovos em estoque"
          description="Registre um lote de ovos para gerar o código de rastreabilidade."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rastreabilidade</TableHead>
                <TableHead>Granja / Lote</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Produção</TableHead>
                <TableHead>Validade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((i) => {
                const rel = i as Row;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.trace_code}</TableCell>
                    <TableCell className="text-ink-muted">
                      {rel.farms?.name ?? "—"}
                      {rel.flocks?.code ? ` · ${rel.flocks.code}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.quality === "bom" ? "success" : "neutral"}>
                        {EGG_QUALITY_LABELS[i.quality]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ink-muted">{i.weight_category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(i.quantity)}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(i.production_date)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(i.expiry_date)}</TableCell>
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
