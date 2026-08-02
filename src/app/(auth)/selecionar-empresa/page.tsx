import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { getSessionContext } from "@/lib/auth/context";
import { setActiveOrg } from "@/lib/auth/org-actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Selecionar empresa" };

export default async function SelecionarEmpresaPage() {
  const ctx = await getSessionContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecione a empresa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ctx.memberships.map((m) => (
          <form key={m.organizationId} action={setActiveOrg}>
            <input type="hidden" name="organizationId" value={m.organizationId} />
            <Button
              type="submit"
              variant="outline"
              className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                <Building2 className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-medium text-ink">{m.organizationName}</span>
                <span className="text-xs text-ink-muted">{ROLE_LABELS[m.role]}</span>
              </span>
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
