import Link from "next/link";
import { Building2, Warehouse, Users, Ruler, Boxes, Dna, ScrollText } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Configurações" };

const SECTIONS = [
  {
    href: "/configuracoes/empresa",
    label: "Empresa",
    description: "Dados da empresa e timezone.",
    icon: Building2,
  },
  {
    href: "/configuracoes/granjas",
    label: "Granjas",
    description: "Cadastro de granjas.",
    icon: Warehouse,
  },
  {
    href: "/configuracoes/nucleos",
    label: "Núcleos",
    description: "Agrupamentos de aviários por granja.",
    icon: Boxes,
  },
  {
    href: "/configuracoes/linhagens",
    label: "Linhagens",
    description: "Linhagens e curvas de desempenho.",
    icon: Dna,
  },
  {
    href: "/configuracoes/usuarios",
    label: "Usuários",
    description: "Membros e perfis de acesso.",
    icon: Users,
  },
  {
    href: "/configuracoes/unidades",
    label: "Unidades de medida",
    description: "Unidades e fatores de conversão.",
    icon: Ruler,
  },
  {
    href: "/configuracoes/auditoria",
    label: "Auditoria",
    description: "Histórico de ações no sistema.",
    icon: ScrollText,
  },
];

export default async function ConfiguracoesPage() {
  await requirePermission("configuracoes", "read");

  return (
    <>
      <PageHeader title="Configurações" description="Administração da empresa." />
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="transition-colors hover:border-brand/40">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-brand-light text-brand">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium text-ink">{s.label}</p>
                    <p className="text-sm text-ink-muted">{s.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
