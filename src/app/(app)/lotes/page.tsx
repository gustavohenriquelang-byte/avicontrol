import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { FLOCK_STATUS_LABELS } from "@/lib/schemas";
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
import { formatInt, formatDate } from "@/lib/format";
import { FlockRowActions } from "./row-actions";
import { isDemoMode, demoFlocks } from "@/lib/demo";

export const metadata: Metadata = { title: "Lotes" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral"> = {
  producao: "success",
  pre_postura: "warning",
  recria: "warning",
  muda: "warning",
  encerrado: "neutral",
  vazio_sanitario: "neutral",
};

export default async function LotesPage() {
  const { org } = await requirePermission("lotes", "read");
  const canWrite = can(org.role, "lotes", "write");

  let flocks;
  if (isDemoMode()) {
    flocks = demoFlocks;
  } else {
    const supabase = await createClient();
    ({ data: flocks } = await supabase
      .from("flocks")
      .select("*, farms(name), houses(name), breeds(name)")
      .eq("organization_id", org.organizationId)
      .order("code"));
  }

  return (
    <>
      <PageHeader
        title="Lotes"
        description="Lotes de aves alojados."
        actions={
          canWrite && (
            <Link href="/lotes/novo" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" /> Novo lote
            </Link>
          )
        }
      />

      {!flocks || flocks.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum lote cadastrado"
          description="Cadastre um lote para iniciar os lançamentos de produção."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Granja / Aviário</TableHead>
                <TableHead>Linhagem</TableHead>
                <TableHead className="text-right">Aves vivas</TableHead>
                <TableHead>Alojamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flocks.map((f) => {
                const rel = f as unknown as {
                  farms: { name: string } | null;
                  houses: { name: string } | null;
                  breeds: { name: string } | null;
                };
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium tabular-nums">
                      {f.code}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {rel.farms?.name ?? "—"}
                      {rel.houses?.name ? ` · ${rel.houses.name}` : ""}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {rel.breeds?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(f.current_quantity)}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {formatDate(f.housing_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[f.status] ?? "neutral"}>
                        {FLOCK_STATUS_LABELS[f.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite && <FlockRowActions id={f.id} active={f.active} />}
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
