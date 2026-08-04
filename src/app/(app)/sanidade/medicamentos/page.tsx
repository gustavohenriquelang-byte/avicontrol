import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoMedications } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MedicationForm } from "./medication-form";

export const metadata: Metadata = { title: "Medicamentos" };

export default async function MedicamentosPage() {
  const { org } = await requirePermission("sanidade", "read");
  const canWrite = can(org.role, "sanidade", "write");

  let meds;
  if (isDemoMode()) {
    meds = demoMedications;
  } else {
    const supabase = await createClient();
    ({ data: meds } = await supabase.from("medications").select("*").eq("organization_id", org.organizationId).order("name"));
  }

  return (
    <>
      <PageHeader title="Medicamentos" description="Cadastro de medicamentos e período de carência." />
      {canWrite && <MedicationForm />}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead className="text-right">Carência</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(meds ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-ink-muted">{m.kind ?? "—"}</TableCell>
                <TableCell className="text-ink-muted">{m.manufacturer ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{m.withdrawal_days ?? 0}d</TableCell>
                <TableCell>
                  <Badge variant={m.active ? "success" : "neutral"}>{m.active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
