"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { taskSchema } from "@/lib/schemas";
import type { TaskStatus } from "@/lib/supabase/database.types";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createTask(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const { org, ctx } = await requirePermission("tarefas", "write");

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    farm_id: formData.get("farm_id"),
    flock_id: formData.get("flock_id"),
    assigned_to: formData.get("assigned_to"),
    priority: formData.get("priority"),
    due_date: formData.get("due_date"),
    status: formData.get("status") || "pendente",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { ok: false, error: "Verifique os campos.", fieldErrors };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: org.organizationId,
      title: d.title,
      description: d.description ?? null,
      farm_id: d.farm_id ?? null,
      flock_id: d.flock_id ?? null,
      assigned_to: d.assigned_to ?? null,
      priority: d.priority,
      due_date: d.due_date || null,
      status: d.status,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível criar a tarefa." };

  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "insert",
    table: "tasks",
    recordId: data?.id,
    newValue: { title: d.title },
  });

  revalidatePath("/tarefas");
  return { ok: true };
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { org, ctx } = await requirePermission("tarefas", "write");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({
    organizationId: org.organizationId,
    userId: ctx.userId,
    action: "update_task_status",
    table: "tasks",
    recordId: taskId,
    newValue: { status },
  });
  revalidatePath("/tarefas");
}
