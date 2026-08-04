import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoFinEntries, demoFinCategories } from "@/lib/demo";
import { todayISOSaoPaulo, formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntryForm } from "./entry-form";
import { PayButton, SeedCategoriesButton } from "./controls";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Financeiro" };

type Entry = Tables<"financial_entries"> & { financial_categories: { name: string } | null };

export default async function FinanceiroPage() {
  const { org } = await requirePermission("financeiro", "read");
  const canWrite = can(org.role, "financeiro", "write");
  const monthStart = todayISOSaoPaulo().slice(0, 7) + "-01";

  let entries: Entry[];
  let categories: { id: string; name: string; kind: "receita" | "despesa" }[];

  if (isDemoMode()) {
    entries = demoFinEntries;
    categories = demoFinCategories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));
  } else {
    const supabase = await createClient();
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("financial_entries").select("*, financial_categories(name)").eq("organization_id", org.organizationId).order("entry_date", { ascending: false }).limit(200),
      supabase.from("financial_categories").select("id, name, kind").eq("organization_id", org.organizationId).eq("active", true).order("name"),
    ]);
    entries = (e ?? []) as unknown as Entry[];
    categories = (c ?? []) as { id: string; name: string; kind: "receita" | "despesa" }[];
  }

  const inMonth = (e: Entry) => e.entry_date >= monthStart;
  const revenueMonth = entries.filter((e) => e.entry_type === "receita" && inMonth(e)).reduce((s, e) => s + e.amount, 0);
  const expenseMonth = entries.filter((e) => e.entry_type === "despesa" && inMonth(e)).reduce((s, e) => s + e.amount, 0);
  const result = revenueMonth - expenseMonth;
  const toReceive = entries.filter((e) => e.entry_type === "receita" && e.status === "pendente").reduce((s, e) => s + e.amount, 0);
  const toPay = entries.filter((e) => e.entry_type === "despesa" && e.status === "pendente").reduce((s, e) => s + e.amount, 0);

  const summary = [
    { label: "Receitas do mês", value: formatCurrency(revenueMonth), cls: "text-brand-dark" },
    { label: "Despesas do mês", value: formatCurrency(expenseMonth), cls: "text-destructive" },
    { label: "Resultado do mês", value: formatCurrency(result), cls: result >= 0 ? "text-brand-dark" : "text-destructive" },
    { label: "A receber", value: formatCurrency(toReceive), cls: "text-ink" },
    { label: "A pagar", value: formatCurrency(toPay), cls: "text-ink" },
  ];

  // DRE simplificada do mês (despesas por categoria).
  const expenseByCat = new Map<string, number>();
  for (const e of entries) {
    if (e.entry_type === "despesa" && inMonth(e)) {
      const name = e.financial_categories?.name ?? "Sem categoria";
      expenseByCat.set(name, (expenseByCat.get(name) ?? 0) + e.amount);
    }
  }
  const dre = [...expenseByCat.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Receitas, despesas, contas a pagar/receber e resultado."
        actions={canWrite && categories.length === 0 && <SeedCategoriesButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="truncate text-sm text-ink-muted">{s.label}</p>
              <p className={"text-lg font-semibold tabular-nums " + s.cls}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canWrite && categories.length > 0 && (
        <EntryForm categories={categories} today={todayISOSaoPaulo()} />
      )}

      {/* DRE simplificada */}
      {dre.length > 0 && (
        <Card>
          <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">
            DRE simplificada — despesas do mês por categoria
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">% das despesas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dre.map(([name, value]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(value)}</TableCell>
                  <TableCell className="text-right tabular-nums text-ink-muted">
                    {expenseMonth > 0 ? ((value / expenseMonth) * 100).toFixed(1) : "0"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Lançamentos */}
      {entries.length === 0 ? (
        <EmptyState icon={Wallet} title="Sem lançamentos" description="Registre receitas e despesas para acompanhar o resultado." />
      ) : (
        <Card>
          <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">Lançamentos</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => {
                const rel = e as Entry;
                const receita = e.entry_type === "receita";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="tabular-nums">{formatDate(e.entry_date)}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-ink-muted">{rel.financial_categories?.name ?? "—"}</TableCell>
                    <TableCell className={"text-right font-medium tabular-nums " + (receita ? "text-brand-dark" : "text-destructive")}>
                      {receita ? "+" : "−"} {formatCurrency(e.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === "pago" ? "success" : "warning"}>
                        {e.status === "pago" ? "Baixado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    {canWrite && (
                      <TableCell>{e.status === "pendente" && <PayButton id={e.id} />}</TableCell>
                    )}
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
