"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "./actions";
import { SALES_ORDER_STATUS_LABELS } from "@/lib/schemas";
import type { SalesOrderStatus } from "@/lib/supabase/database.types";
import { Select } from "@/components/ui/select";

export function OrderStatusControl({ id, status }: { id: string; status: SalesOrderStatus }) {
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-9 w-36"
      defaultValue={status}
      disabled={pending}
      onChange={(e) => start(async () => await updateOrderStatus(id, e.target.value as SalesOrderStatus))}
    >
      {Object.entries(SALES_ORDER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </Select>
  );
}
