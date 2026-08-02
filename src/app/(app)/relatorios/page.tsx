import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  await requirePermission("relatorios", "read");
  return (
    <ComingSoon
      title="Relatórios"
      description="Produção, mortalidade, alimentação, vendas, DRE e rentabilidade."
      stage="Etapa 7"
    />
  );
}
