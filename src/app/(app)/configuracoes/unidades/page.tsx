import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Unidades de medida" };

export default async function UnidadesPage() {
  await requirePermission("configuracoes", "read");
  return (
    <ComingSoon
      title="Unidades de medida"
      description="Unidades e fatores de conversão (dúzia, bandeja, caixa, kg)."
      stage="Etapa 4"
    />
  );
}
