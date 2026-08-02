import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Warehouse } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { HOUSE_STATUS_LABELS, HOUSING_SYSTEM_LABELS } from "@/lib/schemas";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { formatInt } from "@/lib/format";
import { HouseRowActions } from "./row-actions";
import { isDemoMode, demoHouses } from "@/lib/demo";

export const metadata: Metadata = { title: "Aviários" };

export default async function AviariosPage() {
  const { org } = await requirePermission("aviarios", "read");
  const canWrite = can(org.role, "aviarios", "write");

  let houses;
  if (isDemoMode()) {
    houses = demoHouses;
  } else {
    const supabase = await createClient();
    ({ data: houses } = await supabase
      .from("houses")
      .select("*, farms(name)")
      .eq("organization_id", org.organizationId)
      .order("code"));
  }

  return (
    <>
      <PageHeader
        title="Aviários"
        description="Galpões e aviários por granja."
        actions={
          canWrite && (
            <Link href="/aviarios/novo" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" /> Novo aviário
            </Link>
          )
        }
      />

      {!houses || houses.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Nenhum aviário cadastrado"
          description="Cadastre aviários para poder alojar lotes."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Granja</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead className="text-right">Capacidade</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {houses.map((h) => {
                const farmName =
                  (h as unknown as { farms: { name: string } | null }).farms
                    ?.name ?? "—";
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium tabular-nums">
                      {h.code}
                    </TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell className="text-ink-muted">{farmName}</TableCell>
                    <TableCell className="text-ink-muted">
                      {HOUSING_SYSTEM_LABELS[h.housing_system]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(h.capacity)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.status === "ativo" ? "success" : "neutral"}>
                        {HOUSE_STATUS_LABELS[h.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <HouseRowActions id={h.id} active={h.active} />
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
