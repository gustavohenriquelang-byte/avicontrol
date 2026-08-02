import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  await requirePermission("clientes", "read");
  return (
    <ComingSoon
      title="Clientes"
      description="Cadastro de clientes e limites de crédito."
      stage="Etapa 6"
    />
  );
}
