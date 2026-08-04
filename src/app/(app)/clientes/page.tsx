import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoCustomers } from "@/lib/demo";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CustomerRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const { org } = await requirePermission("clientes", "read");
  const canWrite = can(org.role, "clientes", "write");

  let customers;
  if (isDemoMode()) {
    customers = demoCustomers;
  } else {
    const supabase = await createClient();
    ({ data: customers } = await supabase.from("customers").select("*").eq("organization_id", org.organizationId).order("name"));
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes e limites de crédito."
        actions={canWrite && (
          <Link href="/clientes/novo" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" /> Novo cliente
          </Link>
        )}
      />

      {!customers || customers.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente" description="Cadastre clientes para registrar vendas e contas a receber." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Limite crédito</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-ink-muted">{c.doc ?? "—"}</TableCell>
                  <TableCell className="text-ink-muted">{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell className="text-ink-muted">{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.credit_limit ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant={c.active ? "success" : "neutral"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>{canWrite && <CustomerRowActions id={c.id} active={c.active} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
