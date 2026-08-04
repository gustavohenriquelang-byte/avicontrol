import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  await requirePermission("clientes", "write");
  return (
    <>
      <PageHeader title="Novo cliente" description="Cadastre um novo cliente." />
      <CustomerForm />
    </>
  );
}
