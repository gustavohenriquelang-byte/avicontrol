import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FlockForm } from "../flock-form";

export const metadata: Metadata = { title: "Editar lote" };

export default async function EditarLotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requirePermission("lotes", "write");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: flock }, { data: farms }, { data: houses }, { data: breeds }] =
    await Promise.all([
      supabase
        .from("flocks")
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
      supabase
        .from("houses")
        .select("id, name")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("breeds")
        .select("id, name")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("name"),
    ]);

  if (!flock) notFound();

  return (
    <>
      <PageHeader title="Editar lote" description={`Lote ${flock.code}`} />
      <FlockForm
        flock={flock}
        farms={farms ?? []}
        houses={houses ?? []}
        breeds={breeds ?? []}
      />
    </>
  );
}
