import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoTasks, demoFlocks } from "@/lib/demo";
import { TASK_PRIORITY_LABELS } from "@/lib/schemas";
import { todayISOSaoPaulo, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskForm } from "./task-form";
import { StatusControl } from "./status-control";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Tarefas" };

type Row = Tables<"tasks"> & { flocks: { code: string } | null };

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "neutral"> = {
  alta: "danger",
  media: "warning",
  baixa: "neutral",
};

export default async function TarefasPage() {
  const { org } = await requirePermission("tarefas", "read");
  const canWrite = can(org.role, "tarefas", "write");

  let tasks: Row[];
  let flocks: { id: string; code: string }[];

  if (isDemoMode()) {
    tasks = demoTasks;
    flocks = demoFlocks.map((f) => ({ id: f.id, code: f.code }));
  } else {
    const supabase = await createClient();
    const [{ data: t }, { data: fl }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, flocks(code)")
        .eq("organization_id", org.organizationId)
        .order("status")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(200),
      supabase
        .from("flocks")
        .select("id, code")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("code"),
    ]);
    tasks = (t ?? []) as unknown as Row[];
    flocks = fl ?? [];
  }

  const today = todayISOSaoPaulo();

  return (
    <>
      <PageHeader title="Tarefas" description="Tarefas da granja com prioridade e prazo." />

      {canWrite && <TaskForm flocks={flocks} today={today} />}

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhuma tarefa"
          description="Crie tarefas para organizar o trabalho da equipe."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => {
                const rel = t as Row;
                const overdue =
                  t.due_date != null &&
                  t.due_date < today &&
                  t.status !== "concluida" &&
                  t.status !== "cancelada";
                return (
                  <TableRow key={t.id} className={t.status === "concluida" ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      {t.title}
                      {t.description && (
                        <p className="text-xs font-normal text-ink-muted">{t.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-ink-muted">{rel.flocks?.code ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_VARIANT[t.priority] ?? "neutral"}>
                        {TASK_PRIORITY_LABELS[t.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDate(t.due_date)}
                      {overdue && (
                        <span className="ml-1 text-xs font-medium text-destructive">
                          atrasada
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canWrite ? (
                        <StatusControl taskId={t.id} status={t.status} />
                      ) : (
                        t.status
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
