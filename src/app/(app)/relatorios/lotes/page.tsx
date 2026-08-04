import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { layingRate, cumulativeMortalityRate } from "@/lib/domain/calculations";
import { isDemoMode, demoFlocks, demoDailyRecords } from "@/lib/demo";
import { FLOCK_STATUS_LABELS } from "@/lib/schemas";
import { formatInt, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/report-view";
import type { Column, Row } from "@/lib/export";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Desempenho por lote" };

const columns: Column[] = [
  { key: "lote", label: "Lote" },
  { key: "status", label: "Status" },
  { key: "inicial", label: "Aves alojadas" },
  { key: "vivas", label: "Aves vivas" },
  { key: "ovos", label: "Ovos acum." },
  { key: "postura", label: "Postura média" },
  { key: "mortalidade", label: "Mort. acum." },
];

export default async function RelLotesPage() {
  const { org } = await requirePermission("relatorios", "read");

  let flocks: Tables<"flocks">[];
  let daily: Tables<"daily_records">[];
  if (isDemoMode()) {
    flocks = demoFlocks;
    daily = demoDailyRecords;
  } else {
    const supabase = await createClient();
    const [{ data: fl }, { data: dr }] = await Promise.all([
      supabase.from("flocks").select("*").eq("organization_id", org.organizationId).order("code"),
      supabase.from("daily_records").select("flock_id, eggs_total, birds_start, mortality, culls").eq("organization_id", org.organizationId).limit(5000),
    ]);
    flocks = (fl ?? []) as Tables<"flocks">[];
    daily = (dr ?? []) as Tables<"daily_records">[];
  }

  const byFlock = new Map<string, { eggs: number; live: number; mort: number }>();
  for (const r of daily) {
    const cur = byFlock.get(r.flock_id) ?? { eggs: 0, live: 0, mort: 0 };
    cur.eggs += r.eggs_total;
    cur.live += Math.max(0, r.birds_start - r.mortality - r.culls);
    cur.mort += r.mortality;
    byFlock.set(r.flock_id, cur);
  }

  const rows: Row[] = flocks.map((f) => {
    const a = byFlock.get(f.id) ?? { eggs: 0, live: 0, mort: 0 };
    return {
      lote: f.code,
      status: FLOCK_STATUS_LABELS[f.status],
      inicial: formatInt(f.initial_quantity),
      vivas: formatInt(f.current_quantity),
      ovos: formatInt(a.eggs),
      postura: a.live > 0 ? formatPercent(layingRate(a.eggs, a.live)) : "—",
      mortalidade: formatPercent(cumulativeMortalityRate(a.mort, f.initial_quantity)),
    };
  });

  return (
    <>
      <PageHeader title="Desempenho por lote" description="Comparação de produção e mortalidade entre os lotes." />
      <ReportView filename="desempenho-lotes" columns={columns} rows={rows} numericKeys={["inicial", "vivas", "ovos", "postura", "mortalidade"]} />
    </>
  );
}
