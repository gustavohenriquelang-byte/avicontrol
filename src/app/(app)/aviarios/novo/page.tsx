import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { HouseForm } from "../house-form";
import { isDemoMode, demoFarms } from "@/lib/demo";

export const metadata: Metadata = { title: "Novo aviário" };

export default async function NovoAviarioPage() {
  const { org } = await requirePermission("aviarios", "write");

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
      <PageHeader title="Novo aviário" description="Cadastre um novo aviário." />
      <HouseForm farms={farms ?? []} />
    </>
  );
}
