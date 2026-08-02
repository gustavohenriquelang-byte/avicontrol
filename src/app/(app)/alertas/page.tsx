import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Alertas" };

export default async function AlertasPage() {
  await requirePermission("alertas", "read");
  return (
    <ComingSoon
      title="Alertas"
      description="Motor de regras: produção, mortalidade, estoque, sanidade e financeiro."
      stage="Etapa 5"
    />
  );
}
