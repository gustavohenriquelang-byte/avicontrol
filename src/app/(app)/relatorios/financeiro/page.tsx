import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoFinEntries } from "@/lib/demo";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ReportView } from "@/components/report-view";
import type { Column, Row } from "@/lib/export";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Relatório financeiro" };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const columns: Column[] = [
  { key: "mes", label: "Mês" },
  { key: "receitas", label: "Receitas" },
  { key: "despesas", label: "Despesas" },
  { key: "resultado", label: "Resultado" },
];

export default async function RelFinanceiroPage() {
  const { org } = await requirePermission("relatorios", "read");

  let entries: Tables<"financial_entries">[];
  if (isDemoMode()) {
    entries = demoFinEntries;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("financial_entries")
      .select("entry_type, amount, entry_date")
      .eq("organization_id", org.organizationId)
      .limit(5000);
    entries = (data ?? []) as Tables<"financial_entries">[];
  }

  const byMonth = new Map<string, { rec: number; desp: number }>();
  for (const e of entries) {
    const ym = e.entry_date.slice(0, 7);
    const cur = byMonth.get(ym) ?? { rec: 0, desp: 0 };
    if (e.entry_type === "receita") cur.rec += e.amount;
    else cur.desp += e.amount;
    byMonth.set(ym, cur);
  }

  const list = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const rows: Row[] = list.map(([ym, v]) => ({
    mes: `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`,
    receitas: formatCurrency(v.rec),
    despesas: formatCurrency(v.desp),
    resultado: formatCurrency(v.rec - v.desp),
  }));
  const tRec = list.reduce((s, [, v]) => s + v.rec, 0);
  const tDesp = list.reduce((s, [, v]) => s + v.desp, 0);
  const totals: Row = { mes: "Total", receitas: formatCurrency(tRec), despesas: formatCurrency(tDesp), resultado: formatCurrency(tRec - tDesp) };

  return (
    <>
      <PageHeader title="Financeiro / Fluxo de caixa" description="Receitas, despesas e resultado por mês." />
      <ReportView filename="financeiro-fluxo" columns={columns} rows={rows} numericKeys={["receitas", "despesas", "resultado"]} totals={rows.length ? totals : undefined} />
    </>
  );
}
