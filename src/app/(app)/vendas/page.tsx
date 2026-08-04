import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoSalesOrders } from "@/lib/demo";
import { SALES_ORDER_STATUS_LABELS } from "@/lib/schemas";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusControl } from "./status-control";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Vendas" };

type Row = Tables<"sales_orders"> & { customers: { name: string } | null };

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral"> = {
  faturado: "success",
  entregue: "success",
  pedido: "warning",
  separado: "warning",
  orcamento: "neutral",
  cancelado: "neutral",
};

export default async function VendasPage() {
  const { org } = await requirePermission("vendas", "read");
  const canWrite = can(org.role, "vendas", "write");

  let orders: Row[];
  if (isDemoMode()) {
    orders = demoSalesOrders;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sales_orders")
      .select("*, customers(name)")
      .eq("organization_id", org.organizationId)
      .order("order_date", { ascending: false })
      .limit(100);
    orders = (data ?? []) as unknown as Row[];
  }

  const totalMonth = orders
    .filter((o) => o.status !== "cancelado")
    .reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Pedidos, faturamento e contas a receber."
        actions={canWrite && (
          <Link href="/vendas/novo" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" /> Novo pedido
          </Link>
        )}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-sm text-ink-muted">Pedidos</p><p className="text-xl font-semibold tabular-nums text-ink">{orders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-ink-muted">Total (não cancelados)</p><p className="text-xl font-semibold tabular-nums text-brand-dark">{formatCurrency(totalMonth)}</p></CardContent></Card>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Nenhum pedido" description="Crie um pedido de venda. Ao faturar, gera automaticamente a conta a receber." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const rel = o as Row;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="tabular-nums">{formatDate(o.order_date)}</TableCell>
                    <TableCell className="font-medium">{rel.customers?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(o.total)}</TableCell>
                    <TableCell className="tabular-nums text-ink-muted">{formatDate(o.due_date)}</TableCell>
                    <TableCell>
                      {canWrite ? (
                        <OrderStatusControl id={o.id} status={o.status} />
                      ) : (
                        <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"}>{SALES_ORDER_STATUS_LABELS[o.status]}</Badge>
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
