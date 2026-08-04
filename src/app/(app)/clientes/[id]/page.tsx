import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoCustomers } from "@/lib/demo";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requirePermission("clientes", "write");
  const { id } = await params;

  let customer;
  if (isDemoMode()) {
    customer = demoCustomers.find((c) => c.id === id) ?? null;
  } else {
    const supabase = await createClient();
    ({ data: customer } = await supabase.from("customers").select("*").eq("id", id).eq("organization_id", org.organizationId).maybeSingle());
  }
  if (!customer) notFound();

  return (
    <>
      <PageHeader title="Editar cliente" description={customer.name} />
      <CustomerForm customer={customer} />
    </>
  );
}
