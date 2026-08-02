import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Dna } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoBreeds } from "@/lib/demo";
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
import { BreedRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Linhagens" };

export default async function LinhagensPage() {
  const { org } = await requirePermission("configuracoes", "read");
  const canWrite = can(org.role, "configuracoes", "write");

  let breeds;
  if (isDemoMode()) {
    breeds = demoBreeds;
  } else {
    const supabase = await createClient();
    ({ data: breeds } = await supabase
      .from("breeds")
      .select("*")
      .eq("organization_id", org.organizationId)
      .order("name"));
  }

  return (
    <>
      <PageHeader
        title="Linhagens"
        description="Linhagens de aves e suas curvas de desempenho."
        actions={
          canWrite && (
            <Link
              href="/configuracoes/linhagens/nova"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" /> Nova linhagem
            </Link>
          )
        }
      />

      {!breeds || breeds.length === 0 ? (
        <EmptyState
          icon={Dna}
          title="Nenhuma linhagem cadastrada"
          description="Cadastre linhagens para vincular aos lotes e comparar com a curva esperada."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Coloração</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {breeds.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="capitalize text-ink-muted">
                    {b.color ?? "—"}
                  </TableCell>
                  <TableCell className="text-ink-muted">
                    {b.supplier ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.active ? "success" : "neutral"}>
                      {b.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canWrite && <BreedRowActions id={b.id} active={b.active} />}
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
