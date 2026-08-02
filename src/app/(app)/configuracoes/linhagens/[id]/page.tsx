import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoBreeds, demoBreedCurve } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { BreedForm } from "../breed-form";
import { CurveEditor } from "../curve-editor";

export const metadata: Metadata = { title: "Editar linhagem" };

export default async function EditarLinhagemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { org } = await requirePermission("configuracoes", "write");
  const { id } = await params;

  let breed;
  let curve;
  if (isDemoMode()) {
    breed = demoBreeds.find((b) => b.id === id) ?? null;
    curve = demoBreedCurve.filter((c) => c.breed_id === id);
  } else {
    const supabase = await createClient();
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase
        .from("breeds")
        .select("*")
        .eq("id", id)
        .eq("organization_id", org.organizationId)
        .maybeSingle(),
      supabase
        .from("breed_curves")
        .select("*")
        .eq("breed_id", id)
        .eq("organization_id", org.organizationId)
        .order("age_weeks"),
    ]);
    breed = b;
    curve = c ?? [];
  }

  if (!breed) notFound();

  return (
    <>
      <PageHeader title="Editar linhagem" description={breed.name} />
      <BreedForm breed={breed} />
      <CurveEditor breedId={breed.id} initial={curve ?? []} />
    </>
  );
}
