import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Ambiente" };

export default async function AmbientePage() {
  await requirePermission("ambiente", "read");
  return (
    <ComingSoon
      title="Ambiente"
      description="Temperatura, umidade, amônia, CO₂ e luminosidade."
      stage="Etapa 5"
    />
  );
}
