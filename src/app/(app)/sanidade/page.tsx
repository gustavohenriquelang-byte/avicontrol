import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Sanidade" };

export default async function SanidadePage() {
  await requirePermission("sanidade", "read");
  return (
    <ComingSoon
      title="Sanidade"
      description="Vacinas, medicamentos, agenda sanitária e ocorrências."
      stage="Etapa 5"
    />
  );
}
