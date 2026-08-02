import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Pesagens" };

export default async function PesagensPage() {
  await requirePermission("pesagens", "read");
  return (
    <ComingSoon
      title="Pesagens"
      description="Pesagens, uniformidade e comparação com a curva esperada."
      stage="Etapa 5"
    />
  );
}
