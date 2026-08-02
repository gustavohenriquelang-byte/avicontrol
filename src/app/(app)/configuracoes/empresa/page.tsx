import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmpresaForm } from "./empresa-form";
import { isDemoMode, demoOrganization } from "@/lib/demo";

export const metadata: Metadata = { title: "Empresa" };

export default async function EmpresaPage() {
  const { org } = await requirePermission("configuracoes", "read");

  let data;
  if (isDemoMode()) {
    data = demoOrganization;
  } else {
    const supabase = await createClient();
    ({ data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", org.organizationId)
      .maybeSingle());
  }

  if (!data) notFound();

  return (
    <>
      <PageHeader title="Empresa" description="Dados cadastrais da empresa." />
      <EmpresaForm org={data} />
    </>
  );
}
