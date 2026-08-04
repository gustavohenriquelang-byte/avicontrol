import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoCustomers, demoProducts } from "@/lib/demo";
import { todayISOSaoPaulo } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { OrderForm } from "../order-form";

export const metadata: Metadata = { title: "Novo pedido" };

export default async function NovoPedidoPage() {
  const { org } = await requirePermission("vendas", "write");

  let customers: { id: string; name: string }[];
  let products: { id: string; name: string; price: number; classification: string | null }[];

  if (isDemoMode()) {
    customers = demoCustomers.map((c) => ({ id: c.id, name: c.name }));
    products = demoProducts.map((p) => ({ id: p.id, name: p.name, price: p.price ?? 0, classification: p.classification }));
  } else {
    const supabase = await createClient();
    const [{ data: cs }, { data: ps }] = await Promise.all([
      supabase.from("customers").select("id, name").eq("organization_id", org.organizationId).eq("active", true).order("name"),
      supabase.from("products").select("id, name, price, classification").eq("organization_id", org.organizationId).eq("active", true).order("name"),
    ]);
    customers = cs ?? [];
    products = (ps ?? []).map((p) => ({ id: p.id, name: p.name, price: p.price ?? 0, classification: p.classification }));
  }

  return (
    <>
      <PageHeader title="Novo pedido" description="Crie um pedido de venda com itens." />
      <OrderForm customers={customers} products={products} today={todayISOSaoPaulo()} />
    </>
  );
}
