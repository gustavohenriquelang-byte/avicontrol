import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Vendas" };

export default async function VendasPage() {
  await requirePermission("vendas", "read");
  return (
    <ComingSoon
      title="Vendas"
      description="Pedidos, faturamento e contas a receber."
      stage="Etapa 6"
    />
  );
}
