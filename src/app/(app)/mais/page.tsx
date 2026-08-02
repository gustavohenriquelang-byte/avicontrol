import Link from "next/link";
import { requireActiveOrg } from "@/lib/auth/context";
import { visibleModules } from "@/lib/auth/roles";
import { NAV_ITEMS } from "@/lib/navigation";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Mais" };

export default async function MaisPage() {
  const { org } = await requireActiveOrg();
  const allowed = visibleModules(org.role);
  const items = NAV_ITEMS.filter((i) => allowed.includes(i.module));

  return (
    <>
      <PageHeader title="Mais" description="Todos os módulos disponíveis." />
      <Card>
        <ul className="divide-y divide-hairline">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-medium text-ink">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
