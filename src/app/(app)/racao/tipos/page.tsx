import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoFeedTypes } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedTypeForm } from "./feed-type-form";
import { FeedTypeToggle } from "./row-actions";

export const metadata: Metadata = { title: "Tipos de ração" };

export default async function TiposRacaoPage() {
  const { org } = await requirePermission("racao", "read");
  const canWrite = can(org.role, "racao", "write");

  let types;
  if (isDemoMode()) {
    types = demoFeedTypes;
  } else {
    const supabase = await createClient();
    ({ data: types } = await supabase
      .from("feed_types")
      .select("*")
      .eq("organization_id", org.organizationId)
      .order("name"));
  }

  return (
    <>
      <PageHeader title="Tipos de ração" description="Cadastro dos tipos de ração usados na granja." />

      {canWrite && <FeedTypeForm />}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Situação</TableHead>
              {canWrite && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(types ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-ink-muted">{t.description ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={t.active ? "success" : "neutral"}>
                    {t.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <FeedTypeToggle id={t.id} active={t.active} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
