"use client";

import { useTransition } from "react";
import { updateScheduleStatus } from "./actions";
import { SCHEDULE_STATUS_LABELS } from "@/lib/schemas";
import type { ScheduleStatus } from "@/lib/supabase/database.types";
import { Select } from "@/components/ui/select";

export function ScheduleControl({
  id,
  status,
}: {
  id: string;
  status: ScheduleStatus;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-9 w-36"
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => await updateScheduleStatus(id, e.target.value as ScheduleStatus))
      }
    >
      {Object.entries(SCHEDULE_STATUS_LABELS).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </Select>
  );
}
