import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
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
import { FarmRowActions } from "./row-actions";
import { isDemoMode, demoFarms } from "@/lib/demo";

export const metadata: Metadata = { title: "Granjas" };

export default async function GranjasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { org } = await requirePermission("configuracoes", "read");
  const { q } = await searchParams;
  const canWrite = can(org.role, "configuracoes", "write");

  let farms;
  if (isDemoMode()) {
    farms = q
      ? demoFarms.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
      : demoFarms;
  } else {
    const supabase = await createClient();
    let query = supabase
      .from("farms")
      .select("*")
      .eq("organization_id", org.organizationId)
      .order("name");
    if (q) query = query.ilike("name", `%${q}%`);
    ({ data: farms } = await query);
  }

  return (
    <>
      <PageHeader
        title="Granjas"
        description="Cadastro de granjas da empresa."
        actions={
          canWrite && (
            <Link
              href="/configuracoes/granjas/nova"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" /> Nova granja
            </Link>
          )
        }
      />

      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Pesquisar granja..."
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {!farms || farms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma granja cadastrada"
          description="Cadastre a primeira granja para organizar aviários e lotes."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {farms.map((farm) => (
                <TableRow key={farm.id}>
                  <TableCell className="font-medium tabular-nums">
                    {farm.code}
                  </TableCell>
                  <TableCell>{farm.name}</TableCell>
                  <TableCell className="text-ink-muted">
                    {[farm.city, farm.state].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>
                    {farm.active ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="neutral">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite && (
                      <FarmRowActions
                        id={farm.id}
                        active={farm.active}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
