import { getSessionContext } from "@/lib/auth/context";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const ctx = await getSessionContext();

  return (
    <>
      <PageHeader title="Meu perfil" description="Seus dados e vínculos." />
      <Card>
        <CardContent className="space-y-3 p-6 text-sm">
          <div>
            <p className="text-ink-muted">Nome</p>
            <p className="font-medium text-ink">{ctx.fullName ?? "—"}</p>
          </div>
          <div>
            <p className="text-ink-muted">E-mail</p>
            <p className="font-medium text-ink">{ctx.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-ink-muted">Empresas</p>
            <ul className="mt-1 space-y-1">
              {ctx.memberships.map((m) => (
                <li key={m.organizationId} className="text-ink">
                  {m.organizationName} —{" "}
                  <span className="text-brand">{ROLE_LABELS[m.role]}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </>
  );
}
