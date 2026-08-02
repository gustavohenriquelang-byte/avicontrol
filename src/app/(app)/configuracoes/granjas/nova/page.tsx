import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { FarmForm } from "../farm-form";

export const metadata: Metadata = { title: "Nova granja" };

export default async function NovaGranjaPage() {
  await requirePermission("configuracoes", "write");
  return (
    <>
      <PageHeader title="Nova granja" description="Cadastre uma nova granja." />
      <FarmForm />
    </>
  );
}
