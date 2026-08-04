import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Layers, Wallet, Egg } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Relatórios" };

const REPORTS = [
  { href: "/relatorios/producao", label: "Produção mensal", description: "Ovos, postura, ração e mortalidade por lote e mês.", icon: TrendingUp },
  { href: "/relatorios/lotes", label: "Desempenho por lote", description: "Compara aves, produção e mortalidade entre lotes.", icon: Layers },
  { href: "/relatorios/ovos", label: "Classificação de ovos", description: "Distribuição por qualidade e aproveitamento.", icon: Egg },
  { href: "/relatorios/financeiro", label: "Financeiro / Fluxo de caixa", description: "Receitas, despesas e resultado por mês.", icon: Wallet },
];

export default async function RelatoriosPage() {
  await requirePermission("relatorios", "read");
  return (
    <>
      <PageHeader title="Relatórios" description="Relatórios com exportação em CSV e impressão em PDF." />
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href}>
              <Card className="transition-colors hover:border-brand/40">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-brand-light text-brand">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium text-ink">{r.label}</p>
                    <p className="text-sm text-ink-muted">{r.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
