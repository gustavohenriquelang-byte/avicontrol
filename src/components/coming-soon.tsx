import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder para módulos que serão implementados nas próximas etapas. */
export function ComingSoon({
  title,
  description,
  stage,
}: {
  title: string;
  description?: string;
  stage?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="Módulo em construção"
        description={
          stage
            ? `Este módulo será entregue na ${stage}.`
            : "Este módulo será implementado nas próximas etapas do projeto."
        }
      />
    </>
  );
}
