import { requirePermission } from "@/lib/auth/context";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Tarefas" };

export default async function TarefasPage() {
  await requirePermission("tarefas", "read");
  return (
    <ComingSoon
      title="Tarefas"
      description="Tarefas vinculadas a granja, aviário, lote e eventos."
      stage="Etapa 5"
    />
  );
}
