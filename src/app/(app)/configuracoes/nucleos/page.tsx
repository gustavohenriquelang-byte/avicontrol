import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Boxes } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoUnits } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UnitRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Núcleos" };

export default async function NucleosPage() {
  const { org } = await requirePermission("configuracoes", "read");
  const canWrite = can(org.role, "configuracoes", "write");

  let units;
  if (isDemoMode()) {
    units = demoUnits;
  } else {
    const supabase = await createClient();
    ({ data: units } = await supabase
      .from("farm_units")
      .select("*, farms(name)")
      .eq("organization_id", org.organizationId)
      .order("code"));
  }

  return (
    <>
      <PageHeader
        title="Núcleos"
        description="Agrupamentos opcionais de aviários dentro de uma granja."
        actions={
          canWrite && (
            <Link
              href="/configuracoes/nucleos/novo"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" /> Novo núcleo
            </Link>
          )
        }
      />

      {!units || units.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum núcleo cadastrado"
          description="Núcleos são opcionais; use-os para organizar aviários em uma mesma granja."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Granja</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((u) => {
                const farmName =
                  (u as unknown as { farms: { name: string } | null }).farms
                    ?.name ?? "—";
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium tabular-nums">
                      {u.code}
                    </TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell className="text-ink-muted">{farmName}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "success" : "neutral"}>
                        {u.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite && <UnitRowActions id={u.id} active={u.active} />}
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
