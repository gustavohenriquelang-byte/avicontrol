import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoUnits, demoFarms } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { UnitForm } from "../unit-form";

export const metadata: Metadata = { title: "Editar núcleo" };

export default async function EditarNucleoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requirePermission("configuracoes", "write");
  const { id } = await params;

  let unit;
  let farms;
  if (isDemoMode()) {
    unit = demoUnits.find((u) => u.id === id) ?? null;
    farms = demoFarms.map((f) => ({ id: f.id, name: f.name }));
  } else {
    const supabase = await createClient();
    const [{ data: u }, { data: f }] = await Promise.all([
      supabase
        .from("farm_units")
        .select("*")
        .eq("id", id)
        .eq("organization_id", org.organizationId)
        .maybeSingle(),
      supabase
        .from("farms")
        .select("id, name")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("name"),
    ]);
    unit = u;
    farms = f;
  }

  if (!unit) notFound();

  return (
    <>
      <PageHeader title="Editar núcleo" description={unit.name} />
      <UnitForm unit={unit} farms={farms ?? []} />
    </>
  );
}
