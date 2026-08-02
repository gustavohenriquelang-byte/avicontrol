import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const { org } = await requirePermission("configuracoes", "read");
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("organization_users")
    .select("id, role, active, profiles(full_name, email)")
    .eq("organization_id", org.organizationId);

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Membros da empresa e seus perfis de acesso."
      />
      {!members || members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário"
          description="O convite de novos usuários será implementado na Etapa 1+ (fluxo de convites)."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const p = (
                  m as unknown as {
                    profiles: { full_name: string | null; email: string | null } | null;
                  }
                ).profiles;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {p?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-ink-muted">{p?.email ?? "—"}</TableCell>
                    <TableCell>{ROLE_LABELS[m.role as Role]}</TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "success" : "neutral"}>
                        {m.active ? "Ativo" : "Inativo"}
                      </Badge>
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
