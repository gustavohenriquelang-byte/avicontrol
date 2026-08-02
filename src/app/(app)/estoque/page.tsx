import type { Metadata } from "next";
import Link from "next/link";
import { Wheat, Egg, ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, demoFeedInventory, demoEggInventory } from "@/lib/demo";
import { formatInt, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  const { org } = await requirePermission("estoque", "read");

  let feedKg = 0;
  let feedValue = 0;
  let eggUnits = 0;

  if (isDemoMode()) {
    feedKg = demoFeedInventory.reduce((s, i) => s + i.quantity_kg, 0);
    feedValue = demoFeedInventory.reduce((s, i) => s + i.quantity_kg * i.avg_cost, 0);
    eggUnits = demoEggInventory.reduce((s, i) => s + i.quantity, 0);
  } else {
    const supabase = await createClient();
    const [{ data: feed }, { data: eggs }] = await Promise.all([
      supabase.from("feed_inventory").select("quantity_kg, avg_cost").eq("organization_id", org.organizationId),
      supabase.from("egg_inventory").select("quantity").eq("organization_id", org.organizationId).gt("quantity", 0),
    ]);
    feedKg = (feed ?? []).reduce((s, i) => s + i.quantity_kg, 0);
    feedValue = (feed ?? []).reduce((s, i) => s + i.quantity_kg * i.avg_cost, 0);
    eggUnits = (eggs ?? []).reduce((s, i) => s + i.quantity, 0);
  }

  const cards = [
    {
      href: "/racao",
      icon: Wheat,
      label: "Estoque de ração",
      lines: [`${formatInt(feedKg)} kg`, formatCurrency(feedValue)],
    },
    {
      href: "/ovos",
      icon: Egg,
      label: "Estoque de ovos",
      lines: [`${formatInt(eggUnits)} unidades`, "Com rastreabilidade"],
    },
  ];

  return (
    <>
      <PageHeader title="Estoque" description="Visão geral dos estoques da granja." />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}>
              <Card className="transition-colors hover:border-brand/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-brand-light text-brand">
                    <Icon className="size-6" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-ink">{c.label}</p>
                    <p className="text-sm text-ink-muted">
                      {c.lines[0]} · {c.lines[1]}
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-ink-muted" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
