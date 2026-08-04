"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "./actions";
import { TASK_STATUS_LABELS } from "@/lib/schemas";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { Select } from "@/components/ui/select";

export function StatusControl({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-9 w-40"
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => await updateTaskStatus(taskId, e.target.value as TaskStatus))
      }
    >
      {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </Select>
  );
}
