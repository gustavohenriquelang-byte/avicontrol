import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FlockForm } from "../flock-form";
import { isDemoMode, demoFarms, demoHouses } from "@/lib/demo";

export const metadata: Metadata = { title: "Novo lote" };

export default async function NovoLotePage() {
  const { org } = await requirePermission("lotes", "write");

  if (isDemoMode()) {
    return (
      <>
        <PageHeader title="Novo lote" description="Cadastre um novo lote de aves." />
        <FlockForm
          farms={demoFarms.map((f) => ({ id: f.id, name: f.name }))}
          houses={demoHouses.map((h) => ({ id: h.id, name: h.name }))}
          breeds={[
            { id: "breed-1", name: "Hy-Line W-36" },
            { id: "breed-2", name: "Lohmann Brown" },
          ]}
        />
      </>
    );
  }

  const supabase = await createClient();

  const [{ data: farms }, { data: houses }, { data: breeds }] = await Promise.all([
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

  return (
    <>
      <PageHeader title="Novo lote" description="Cadastre um novo lote de aves." />
      <FlockForm farms={farms ?? []} houses={houses ?? []} breeds={breeds ?? []} />
    </>
  );
}
