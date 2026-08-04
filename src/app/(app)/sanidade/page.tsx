import type { Metadata } from "next";
import Link from "next/link";
import { Syringe, Pill, CalendarClock } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import {
  isDemoMode,
  demoFlocks,
  demoVaccines,
  demoMedications,
  demoHealthEvents,
  demoSchedules,
} from "@/lib/demo";
import { HEALTH_EVENT_LABELS, SCHEDULE_STATUS_LABELS } from "@/lib/schemas";
import { todayISOSaoPaulo, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EventForm } from "./event-form";
import { ScheduleControl } from "./schedule-control";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Sanidade" };

type EventRow = Tables<"health_events"> & {
  flocks: { code: string } | null;
  vaccines: { name: string } | null;
  medications: { name: string } | null;
};
type SchedRow = Tables<"vaccination_schedules"> & {
  flocks: { code: string } | null;
  vaccines: { name: string } | null;
};

export default async function SanidadePage() {
  const { org } = await requirePermission("sanidade", "read");
  const canWrite = can(org.role, "sanidade", "write");
  const today = todayISOSaoPaulo();

  let flocks: { id: string; name: string }[];
  let vaccines: { id: string; name: string }[];
  let medications: { id: string; name: string }[];
  let events: EventRow[];
  let schedules: SchedRow[];

  if (isDemoMode()) {
    flocks = demoFlocks.map((f) => ({ id: f.id, name: f.code }));
    vaccines = demoVaccines.map((v) => ({ id: v.id, name: v.name }));
    medications = demoMedications.map((m) => ({ id: m.id, name: m.name }));
    events = demoHealthEvents;
    schedules = demoSchedules;
  } else {
    const supabase = await createClient();
    const [{ data: fl }, { data: vac }, { data: med }, { data: ev }, { data: sc }] = await Promise.all([
      supabase.from("flocks").select("id, code").eq("organization_id", org.organizationId).eq("active", true).order("code"),
      supabase.from("vaccines").select("id, name").eq("organization_id", org.organizationId).eq("active", true).order("name"),
      supabase.from("medications").select("id, name").eq("organization_id", org.organizationId).eq("active", true).order("name"),
      supabase.from("health_events").select("*, flocks(code), vaccines(name), medications(name)").eq("organization_id", org.organizationId).order("event_date", { ascending: false }).limit(50),
      supabase.from("vaccination_schedules").select("*, flocks(code), vaccines(name)").eq("organization_id", org.organizationId).neq("status", "realizada").order("scheduled_date").limit(50),
    ]);
    flocks = (fl ?? []).map((f) => ({ id: f.id, name: f.code }));
    vaccines = vac ?? [];
    medications = med ?? [];
    events = (ev ?? []) as unknown as EventRow[];
    schedules = (sc ?? []) as unknown as SchedRow[];
  }

  return (
    <>
      <PageHeader
        title="Sanidade"
        description="Vacinas, medicamentos, agenda sanitária e ocorrências."
        actions={
          canWrite && (
            <div className="flex gap-2">
              <Link href="/sanidade/vacinas" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Syringe className="size-4" /> Vacinas
              </Link>
              <Link href="/sanidade/medicamentos" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pill className="size-4" /> Medicamentos
              </Link>
            </div>
          )
        }
      />

      {/* Agenda de vacinação */}
      <Card>
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">
          <CalendarClock className="size-4 text-brand" /> Agenda sanitária
        </div>
        {schedules.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">Nenhuma vacinação agendada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Vacina</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => {
                const rel = s as SchedRow;
                const overdue = s.scheduled_date < today && s.status !== "realizada" && s.status !== "cancelada";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="tabular-nums">
                      {formatDate(s.scheduled_date)}
                      {overdue && <span className="ml-1 text-xs font-medium text-destructive">atrasada</span>}
                    </TableCell>
                    <TableCell className="font-medium">{rel.flocks?.code ?? "—"}</TableCell>
                    <TableCell className="text-ink-muted">{rel.vaccines?.name ?? "—"}</TableCell>
                    <TableCell>
                      {canWrite ? (
                        <ScheduleControl id={s.id} status={s.status} />
                      ) : (
                        SCHEDULE_STATUS_LABELS[s.status]
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {canWrite && (
        <EventForm flocks={flocks} vaccines={vaccines} medications={medications} today={today} />
      )}

      {/* Histórico de eventos */}
      {events.length === 0 ? (
        <EmptyState icon={Syringe} title="Sem eventos sanitários" description="Registre vacinações, medicações e ocorrências." />
      ) : (
        <Card>
          <div className="border-b border-hairline px-4 py-3 text-sm font-semibold text-ink">Histórico</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Carência até</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => {
                const rel = e as EventRow;
                const product = rel.vaccines?.name ?? rel.medications?.name ?? e.description ?? "—";
                const inCarencia = e.withdrawal_until != null && e.withdrawal_until >= today;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="tabular-nums">{formatDate(e.event_date)}</TableCell>
                    <TableCell>
                      <Badge variant={e.event_type === "ocorrencia" ? "warning" : "default"}>
                        {HEALTH_EVENT_LABELS[e.event_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-ink-muted">{rel.flocks?.code ?? "—"}</TableCell>
                    <TableCell>{product}</TableCell>
                    <TableCell className="text-ink-muted">{e.responsible ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {e.withdrawal_until ? (
                        <span className={inCarencia ? "font-medium text-warning" : "text-ink-muted"}>
                          {formatDate(e.withdrawal_until)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
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
