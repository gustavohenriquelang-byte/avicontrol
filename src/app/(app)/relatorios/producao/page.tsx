import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { layingRate } from "@/lib/domain/calculations";
import { isDemoMode, demoDailyRecords, demoFlocks } from "@/lib/demo";
import { formatInt, formatDecimal, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/report-view";
import type { Column, Row } from "@/lib/export";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Relatório de produção" };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const columns: Column[] = [
  { key: "mes", label: "Mês" },
  { key: "lote", label: "Lote" },
  { key: "ovos", label: "Ovos" },
  { key: "postura", label: "Postura média" },
  { key: "racao", label: "Ração (kg)" },
  { key: "mortalidade", label: "Mortalidade" },
];

export default async function RelProducaoPage() {
  const { org } = await requirePermission("relatorios", "read");

  let records: (Tables<"daily_records"> & { code: string })[];
  if (isDemoMode()) {
    const codeById = new Map(demoFlocks.map((f) => [f.id, f.code]));
    records = demoDailyRecords.map((r) => ({ ...r, code: codeById.get(r.flock_id) ?? "—" }));
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("daily_records")
      .select("*, flocks(code)")
      .eq("organization_id", org.organizationId)
      .order("record_date", { ascending: false })
      .limit(2000);
    records = (data ?? []).map((r) => ({
      ...(r as Tables<"daily_records">),
      code: (r as unknown as { flocks: { code: string } | null }).flocks?.code ?? "—",
    }));
  }

  // Agrega por mês + lote.
  const agg = new Map<string, { mes: string; lote: string; eggs: number; live: number; feed: number; mort: number }>();
  for (const r of records) {
    const ym = r.record_date.slice(0, 7);
    const key = `${ym}|${r.code}`;
    const cur = agg.get(key) ?? {
      mes: `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`,
      lote: r.code,
      eggs: 0,
      live: 0,
      feed: 0,
      mort: 0,
    };
    cur.eggs += r.eggs_total;
    cur.live += Math.max(0, r.birds_start - r.mortality - r.culls);
    cur.feed += r.feed_kg;
    cur.mort += r.mortality;
    agg.set(key, cur);
  }

  const list = [...agg.values()].sort((a, b) => (a.mes + a.lote < b.mes + b.lote ? 1 : -1));
  const rows: Row[] = list.map((a) => ({
    mes: a.mes,
    lote: a.lote,
    ovos: formatInt(a.eggs),
    postura: formatPercent(layingRate(a.eggs, a.live)),
    racao: formatDecimal(a.feed),
    mortalidade: formatInt(a.mort),
  }));
  const totals: Row = {
    mes: "Total",
    lote: "",
    ovos: formatInt(list.reduce((s, a) => s + a.eggs, 0)),
    postura: "",
    racao: formatDecimal(list.reduce((s, a) => s + a.feed, 0)),
    mortalidade: formatInt(list.reduce((s, a) => s + a.mort, 0)),
  };

  return (
    <>
      <PageHeader title="Produção mensal" description="Ovos, postura, ração e mortalidade por lote e mês." />
      <ReportView filename="producao-mensal" columns={columns} rows={rows} numericKeys={["ovos", "postura", "racao", "mortalidade"]} totals={rows.length ? totals : undefined} />
    </>
  );
}
