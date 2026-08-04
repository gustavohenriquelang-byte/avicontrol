import type { Metadata } from "next";
import { Bell, AlertTriangle, Info, CircleAlert, CheckCircle2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { layingRate } from "@/lib/domain/calculations";
import { daysOfStock } from "@/lib/domain/inventory";
import { computeAlerts, type AlertInput, type ComputedAlert } from "@/lib/domain/alerts";
import {
  isDemoMode,
  demoFlocks,
  demoDailyRecords,
  demoDailyFor,
  demoFeedInventory,
  demoSchedules,
  demoTasks,
} from "@/lib/demo";
import { todayISOSaoPaulo, addDaysISO, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Alertas" };

async function buildInput(orgId: string): Promise<AlertInput> {
  const today = todayISOSaoPaulo();
  const in5 = addDaysISO(today, 5);

  if (isDemoMode()) {
    const prodFlocks = demoFlocks.filter((f) => ["producao", "pre_postura", "muda"].includes(f.status));
    const pending = prodFlocks.filter((f) => !demoDailyFor(f.id, today)).map((f) => f.code);

    const latest = [...demoDailyRecords].sort((a, b) => b.record_date.localeCompare(a.record_date))[0];
    const mort = latest
      ? ((latest.mortality / Math.max(1, latest.birds_start)) * 100)
      : null;

    const feedKg = demoFeedInventory.reduce((s, i) => s + i.quantity_kg, 0);
    const avgDaily = demoDailyRecords
      .filter((r) => r.record_date >= addDaysISO(today, -7))
      .reduce((s, r) => s + r.feed_kg, 0) / 7;

    return {
      pendingLaunchFlocks: pending,
      lastDayMortalityRate: mort,
      feedDaysOfStock: daysOfStock(feedKg, avgDaily),
      overdueSchedules: demoSchedules
        .filter((s) => s.scheduled_date < today && s.status !== "realizada" && s.status !== "cancelada")
        .map((s) => ({ flock: s.flocks?.code ?? "—", vaccine: s.vaccines?.name ?? "vacina", date: formatDate(s.scheduled_date) })),
      upcomingSchedules: demoSchedules
        .filter((s) => s.scheduled_date >= today && s.scheduled_date <= in5 && s.status !== "realizada" && s.status !== "cancelada")
        .map((s) => ({ flock: s.flocks?.code ?? "—", vaccine: s.vaccines?.name ?? "vacina", date: formatDate(s.scheduled_date) })),
      overdueTasks: demoTasks
        .filter((t) => t.due_date != null && t.due_date < today && t.status !== "concluida" && t.status !== "cancelada")
        .map((t) => ({ title: t.title, date: formatDate(t.due_date) })),
    };
  }

  const supabase = await createClient();
  const [{ data: flocks }, { data: closedToday }, { data: latestRec }, { data: feedInv }, { data: daily7 }, { data: scheds }, { data: tasks }] =
    await Promise.all([
      supabase.from("flocks").select("id, code").eq("organization_id", orgId).eq("active", true).in("status", ["producao", "pre_postura", "muda"]),
      supabase.from("daily_records").select("flock_id").eq("organization_id", orgId).eq("record_date", today).eq("status", "closed"),
      supabase.from("daily_records").select("mortality, birds_start").eq("organization_id", orgId).order("record_date", { ascending: false }).limit(1),
      supabase.from("feed_inventory").select("quantity_kg").eq("organization_id", orgId),
      supabase.from("daily_records").select("feed_kg").eq("organization_id", orgId).gte("record_date", addDaysISO(today, -7)),
      supabase.from("vaccination_schedules").select("scheduled_date, status, flocks(code), vaccines(name)").eq("organization_id", orgId).not("status", "in", "(realizada,cancelada)"),
      supabase.from("tasks").select("title, due_date, status").eq("organization_id", orgId).not("status", "in", "(concluida,cancelada)").not("due_date", "is", null),
    ]);

  const closedIds = new Set((closedToday ?? []).map((c) => c.flock_id));
  const pending = (flocks ?? []).filter((f) => !closedIds.has(f.id)).map((f) => f.code);
  const rec = latestRec?.[0];
  const mort = rec ? (rec.mortality / Math.max(1, rec.birds_start)) * 100 : null;
  const feedKg = (feedInv ?? []).reduce((s, i) => s + i.quantity_kg, 0);
  const avgDaily = (daily7 ?? []).reduce((s, r) => s + (r.feed_kg ?? 0), 0) / 7;

  type Sched = { scheduled_date: string; status: string; flocks: { code: string } | null; vaccines: { name: string } | null };
  const schedList = (scheds ?? []) as unknown as Sched[];

  return {
    pendingLaunchFlocks: pending,
    lastDayMortalityRate: mort,
    feedDaysOfStock: daysOfStock(feedKg, avgDaily),
    overdueSchedules: schedList
      .filter((s) => s.scheduled_date < today)
      .map((s) => ({ flock: s.flocks?.code ?? "—", vaccine: s.vaccines?.name ?? "vacina", date: formatDate(s.scheduled_date) })),
    upcomingSchedules: schedList
      .filter((s) => s.scheduled_date >= today && s.scheduled_date <= in5)
      .map((s) => ({ flock: s.flocks?.code ?? "—", vaccine: s.vaccines?.name ?? "vacina", date: formatDate(s.scheduled_date) })),
    overdueTasks: (tasks ?? [])
      .filter((t) => t.due_date != null && t.due_date < today)
      .map((t) => ({ title: t.title, date: formatDate(t.due_date) })),
  };
}

const LEVEL_STYLE = {
  critico: { icon: CircleAlert, cls: "border-destructive/30 bg-destructive/5", badge: "text-destructive", label: "Crítico" },
  atencao: { icon: AlertTriangle, cls: "border-warning/40 bg-warning/10", badge: "text-[#8a5d0f]", label: "Atenção" },
  informativo: { icon: Info, cls: "border-hairline bg-surface", badge: "text-ink-muted", label: "Informativo" },
} as const;

export default async function AlertasPage() {
  const { org } = await requirePermission("alertas", "read");
  const input = await buildInput(org.organizationId);
  const alerts: ComputedAlert[] = computeAlerts(input);

  const counts = {
    critico: alerts.filter((a) => a.level === "critico").length,
    atencao: alerts.filter((a) => a.level === "atencao").length,
    informativo: alerts.filter((a) => a.level === "informativo").length,
  };

  return (
    <>
      <PageHeader
        title="Alertas"
        description="Avisos automáticos gerados a partir dos seus dados."
      />

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-ink-muted">Críticos</p><p className="text-2xl font-semibold text-destructive">{counts.critico}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-ink-muted">Atenção</p><p className="text-2xl font-semibold text-warning">{counts.atencao}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-ink-muted">Informativos</p><p className="text-2xl font-semibold text-ink-muted">{counts.informativo}</p></CardContent></Card>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Tudo em ordem"
          description="Nenhum alerta no momento. Os avisos aparecem aqui automaticamente conforme os dados são lançados."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => {
            const s = LEVEL_STYLE[a.level];
            const Icon = s.icon;
            return (
              <div key={i} className={"flex items-start gap-3 rounded-lg border px-4 py-3 " + s.cls}>
                <Icon className={"mt-0.5 size-5 shrink-0 " + s.badge} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{a.title}</p>
                    <span className={"text-xs font-semibold uppercase tracking-wide " + s.badge}>{s.label}</span>
                  </div>
                  <p className="text-sm text-ink-muted">{a.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Bell className="size-3.5" /> Os alertas são recalculados a cada acesso, a partir de lançamentos, estoque, agenda sanitária e tarefas.
      </p>
    </>
  );
}
