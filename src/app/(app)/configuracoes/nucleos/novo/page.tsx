import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoFarms } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { UnitForm } from "../unit-form";

export const metadata: Metadata = { title: "Novo núcleo" };

export default async function NovoNucleoPage() {
  const { org } = await requirePermission("configuracoes", "write");

  let farms;
  if (isDemoMode()) {
    farms = demoFarms.map((f) => ({ id: f.id, name: f.name }));
  } else {
    const supabase = await createClient();
    ({ data: farms } = await supabase
      .from("farms")
      .select("id, name")
      .eq("organization_id", org.organizationId)
      .eq("active", true)
      .order("name"));
  }

  return (
    <>
      <PageHeader title="Novo núcleo" description="Cadastre um núcleo em uma granja." />
      <UnitForm farms={farms ?? []} />
    </>
  );
}
