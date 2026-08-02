import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Warehouse, Bird, Building2, Egg, TrendingUp, Wheat, HeartPulse } from "lucide-react";
import { requireActiveOrg } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { layingRate } from "@/lib/domain/calculations";
import {
  isDemoMode,
  demoOverview,
  demoDailyRecords,
} from "@/lib/demo";
import { todayISOSaoPaulo, addDaysISO, formatInt, formatPercent, formatDecimal } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DashboardCharts, type SeriesPoint } from "./dashboard-charts";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Visão geral" };

type Daily = Tables<"daily_records">;

/** Agrega os lançamentos por data (soma entre lotes). */
function buildSeries(records: Daily[]): SeriesPoint[] {
  const byDate = new Map<
    string,
    { eggs: number; live: number; mortality: number; feed: number }
  >();
  for (const r of records) {
    const acc = byDate.get(r.record_date) ?? { eggs: 0, live: 0, mortality: 0, feed: 0 };
    acc.eggs += r.eggs_total;
    acc.live += Math.max(0, r.birds_start - r.mortality - r.culls);
    acc.mortality += r.mortality;
    acc.feed += r.feed_kg;
    byDate.set(r.record_date, acc);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      eggs: v.eggs,
      laying: layingRate(v.eggs, v.live),
      mortality: v.mortality,
      feed: Math.round(v.feed * 10) / 10,
    }));
}

async function getStructural(orgId: string) {
  if (isDemoMode()) return demoOverview;
  const supabase = await createClient();
  const [farms, houses, flocks] = await Promise.all([
    supabase.from("farms").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("active", true),
    supabase.from("houses").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("active", true),
    supabase.from("flocks").select("current_quantity").eq("organization_id", orgId).eq("active", true),
  ]);
  const liveBirds = (flocks.data ?? []).reduce((s, f) => s + (f.current_quantity ?? 0), 0);
  return {
    farms: farms.count ?? 0,
    houses: houses.count ?? 0,
    flocks: (flocks.data ?? []).length,
    liveBirds,
  };
}

async function getDailyRecords(orgId: string): Promise<Daily[]> {
  if (isDemoMode()) return demoDailyRecords;
  const supabase = await createClient();
  const since = addDaysISO(todayISOSaoPaulo(), -90);
  const { data } = await supabase
    .from("daily_records")
    .select("*")
    .eq("organization_id", orgId)
    .gte("record_date", since);
  return data ?? [];
}

export default async function DashboardPage() {
  const { org } = await requireActiveOrg();
  const [structural, records] = await Promise.all([
    getStructural(org.organizationId),
    getDailyRecords(org.organizationId),
  ]);

  const series = buildSeries(records);
  const last = series[series.length - 1];

  // Mortalidade dos últimos 30 dias.
  const mortality30 = series.slice(-30).reduce((s, p) => s + p.mortality, 0);

  const structuralCards = [
    { label: "Granjas ativas", value: formatInt(structural.farms), icon: Building2 },
    { label: "Aviários ativos", value: formatInt(structural.houses), icon: Warehouse },
    { label: "Lotes ativos", value: formatInt(structural.flocks), icon: Layers },
    { label: "Aves vivas", value: formatInt(structural.liveBirds), icon: Bird },
  ];

  const dailyCards = [
    { label: "Ovos (último dia)", value: last ? formatInt(last.eggs) : "—", icon: Egg },
    { label: "Taxa de postura", value: last ? formatPercent(last.laying) : "—", icon: TrendingUp },
    { label: "Ração (último dia)", value: last ? `${formatDecimal(last.feed)} kg` : "—", icon: Wheat },
    { label: "Mortalidade (30d)", value: formatInt(mortality30), icon: HeartPulse },
  ];

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`Bem-vindo(a) ao ${org.organizationName}.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {structuralCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-muted">{s.label}</p>
                  <p className="text-xl font-semibold tabular-nums text-ink">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {series.length === 0 ? (
        <EmptyState
          icon={Egg}
          title="Sem lançamentos ainda"
          description="Registre o lançamento diário para ver a produção, a taxa de postura e os demais indicadores."
          action={
            <Link href="/lancamento" className={buttonVariants({ size: "sm" })}>
              Fazer lançamento
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {dailyCards.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-brand-dark">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-muted">{s.label}</p>
                      <p className="text-xl font-semibold tabular-nums text-ink">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DashboardCharts series={series} />
        </>
      )}
    </>
  );
}
