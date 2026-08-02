import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { isDemoMode } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserForm } from "./create-user-form";
import { RoleSelect, ActiveToggle } from "./user-row-actions";

export const metadata: Metadata = { title: "Usuários" };

interface Member {
  id: string;
  user_id: string;
  role: Role;
  active: boolean;
  full_name: string | null;
  email: string | null;
}

export default async function UsuariosPage() {
  const { ctx, org } = await requirePermission("configuracoes", "read");
  const canManage = can(org.role, "configuracoes", "manage"); // admin

  let members: Member[] = [];
  if (isDemoMode()) {
    members = [
      {
        id: "m-demo",
        user_id: ctx.userId,
        role: "admin",
        active: true,
        full_name: "Administrador Demo",
        email: "admin@avicontrol.local",
      },
    ];
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organization_users")
      .select("id, user_id, role, active, profiles(full_name, email)")
      .eq("organization_id", org.organizationId);
    members = (data ?? []).map((m) => {
      const p = (m as unknown as {
        profiles: { full_name: string | null; email: string | null } | null;
      }).profiles;
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role as Role,
        active: m.active,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
      };
    });
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Crie usuários e defina o perfil de acesso de cada um."
      />

      {canManage && <CreateUserForm />}

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário"
          description="Crie o primeiro usuário no formulário acima."
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
                {canManage && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.user_id === ctx.userId;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.full_name ?? "—"}
                      {isSelf && (
                        <span className="ml-2 text-xs text-ink-muted">(você)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-ink-muted">{m.email ?? "—"}</TableCell>
                    <TableCell>
                      {canManage && !isSelf ? (
                        <RoleSelect memberId={m.id} role={m.role} />
                      ) : (
                        ROLE_LABELS[m.role]
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "success" : "neutral"}>
                        {m.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {!isSelf && <ActiveToggle memberId={m.id} active={m.active} />}
                      </TableCell>
                    )}
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
