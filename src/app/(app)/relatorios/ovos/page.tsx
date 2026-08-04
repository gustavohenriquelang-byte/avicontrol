import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoDailyRecords } from "@/lib/demo";
import { formatInt, formatPercent } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/report-view";
import type { Column, Row } from "@/lib/export";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Classificação de ovos" };

const columns: Column[] = [
  { key: "classe", label: "Classificação" },
  { key: "qtd", label: "Quantidade" },
  { key: "pct", label: "% do total" },
];

const CLASSES: { key: keyof Tables<"daily_records">; label: string }[] = [
  { key: "eggs_good", label: "Bons" },
  { key: "eggs_dirty", label: "Sujos" },
  { key: "eggs_cracked", label: "Trincados" },
  { key: "eggs_broken", label: "Quebrados" },
  { key: "eggs_deformed", label: "Deformados" },
  { key: "eggs_double_yolk", label: "Duas gemas" },
  { key: "eggs_industrial", label: "Industriais" },
  { key: "eggs_discarded", label: "Descartados" },
];

export default async function RelOvosPage() {
  const { org } = await requirePermission("relatorios", "read");

  let daily: Tables<"daily_records">[];
  if (isDemoMode()) {
    daily = demoDailyRecords;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("daily_records")
      .select("eggs_total, eggs_good, eggs_dirty, eggs_cracked, eggs_broken, eggs_deformed, eggs_double_yolk, eggs_industrial, eggs_discarded")
      .eq("organization_id", org.organizationId)
      .limit(5000);
    daily = (data ?? []) as Tables<"daily_records">[];
  }

  const totals: Record<string, number> = {};
  let grand = 0;
  for (const c of CLASSES) totals[c.key as string] = 0;
  for (const r of daily) {
    for (const c of CLASSES) totals[c.key as string] += (r[c.key] as number) ?? 0;
    grand += r.eggs_total;
  }
  const sumClasses = CLASSES.reduce((s, c) => s + totals[c.key as string], 0);

  const rows: Row[] = CLASSES.map((c) => {
    const v = totals[c.key as string];
    return { classe: c.label, qtd: formatInt(v), pct: sumClasses > 0 ? formatPercent((v / sumClasses) * 100) : "—" };
  });

  const commercial = totals["eggs_good"] + totals["eggs_dirty"];
  const totalsRow: Row = { classe: "Total classificado", qtd: formatInt(sumClasses), pct: "100,00%" };

  return (
    <>
      <PageHeader
        title="Classificação de ovos"
        description={`Aproveitamento comercial: ${sumClasses > 0 ? formatPercent((commercial / sumClasses) * 100) : "—"} · Total produzido: ${formatInt(grand)}`}
      />
      <ReportView filename="classificacao-ovos" columns={columns} rows={rows} numericKeys={["qtd", "pct"]} totals={rows.length ? totalsRow : undefined} />
    </>
  );
}
