import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  await requirePermission("financeiro", "read");
  return (
    <ComingSoon
      title="Financeiro"
      description="Receitas, despesas, contas a pagar/receber, fluxo de caixa e DRE."
      stage="Etapa 6"
    />
  );
}
