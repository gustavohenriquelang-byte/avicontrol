import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FarmForm } from "../farm-form";

export const metadata: Metadata = { title: "Editar granja" };

export default async function EditarGranjaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requirePermission("configuracoes", "write");
  const { id } = await params;

  const supabase = await createClient();
  const { data: farm } = await supabase
    .from("farms")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!farm) notFound();

  return (
    <>
      <PageHeader title="Editar granja" description={farm.name} />
      <FarmForm farm={farm} />
    </>
  );
}
