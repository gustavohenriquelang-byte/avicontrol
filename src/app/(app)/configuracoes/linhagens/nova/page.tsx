import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { BreedForm } from "../breed-form";

export const metadata: Metadata = { title: "Nova linhagem" };

export default async function NovaLinhagemPage() {
  await requirePermission("configuracoes", "write");
  return (
    <>
      <PageHeader
        title="Nova linhagem"
        description="Cadastre uma linhagem. A curva pode ser preenchida após salvar."
      />
      <BreedForm />
    </>
  );
}
