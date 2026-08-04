import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoVaccines } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VaccineForm } from "./vaccine-form";

export const metadata: Metadata = { title: "Vacinas" };

export default async function VacinasPage() {
  const { org } = await requirePermission("sanidade", "read");
  const canWrite = can(org.role, "sanidade", "write");

  let vaccines;
  if (isDemoMode()) {
    vaccines = demoVaccines;
  } else {
    const supabase = await createClient();
    ({ data: vaccines } = await supabase.from("vaccines").select("*").eq("organization_id", org.organizationId).order("name"));
  }

  return (
    <>
      <PageHeader title="Vacinas" description="Cadastro de vacinas usadas na granja." />
      {canWrite && <VaccineForm />}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Doença alvo</TableHead>
              <TableHead>Via</TableHead>
              <TableHead className="text-right">Carência</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(vaccines ?? []).map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-ink-muted">{v.target_disease ?? "—"}</TableCell>
                <TableCell className="text-ink-muted">{v.route ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{v.withdrawal_days ?? 0}d</TableCell>
                <TableCell>
                  <Badge variant={v.active ? "success" : "neutral"}>{v.active ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
