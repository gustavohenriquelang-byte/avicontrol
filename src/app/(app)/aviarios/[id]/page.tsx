import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { HouseForm } from "../house-form";

export const metadata: Metadata = { title: "Editar aviário" };

export default async function EditarAviarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requirePermission("aviarios", "write");
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: house }, { data: farms }] = await Promise.all([
    supabase
      .from("houses")
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

  if (!house) notFound();

  return (
    <>
      <PageHeader title="Editar aviário" description={house.name} />
      <HouseForm house={house} farms={farms ?? []} />
    </>
  );
}
