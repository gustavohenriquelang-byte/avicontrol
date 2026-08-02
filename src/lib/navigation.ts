import type { Module } from "@/lib/auth/roles";
import {
  LayoutDashboard,
  TrendingUp,
  PlusCircle,
  Layers,
  Warehouse,
  Egg,
  Wheat,
  Boxes,
  Scale,
  HeartPulse,
  Thermometer,
  Users,
  ShoppingCart,
  Sprout,
  Wallet,
  FileBarChart,
  ListChecks,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  module: Module;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Menu lateral do desktop (item 4). Ordem conforme a especificação. */
export const NAV_ITEMS: NavItem[] = [
  { module: "overview", label: "Visão geral", href: "/", icon: LayoutDashboard },
  { module: "producao", label: "Produção", href: "/producao", icon: TrendingUp },
  { module: "lancamento", label: "Lançamento diário", href: "/lancamento", icon: PlusCircle },
  { module: "lotes", label: "Lotes", href: "/lotes", icon: Layers },
  { module: "aviarios", label: "Aviários", href: "/aviarios", icon: Warehouse },
  { module: "ovos", label: "Ovos", href: "/ovos", icon: Egg },
  { module: "racao", label: "Ração", href: "/racao", icon: Wheat },
  { module: "estoque", label: "Estoque", href: "/estoque", icon: Boxes },
  { module: "pesagens", label: "Pesagens", href: "/pesagens", icon: Scale },
  { module: "sanidade", label: "Sanidade", href: "/sanidade", icon: HeartPulse },
  { module: "ambiente", label: "Ambiente", href: "/ambiente", icon: Thermometer },
  { module: "clientes", label: "Clientes", href: "/clientes", icon: Users },
  { module: "vendas", label: "Vendas", href: "/vendas", icon: ShoppingCart },
  { module: "esterco", label: "Esterco", href: "/esterco", icon: Sprout },
  { module: "financeiro", label: "Financeiro", href: "/financeiro", icon: Wallet },
  { module: "relatorios", label: "Relatórios", href: "/relatorios", icon: FileBarChart },
  { module: "tarefas", label: "Tarefas", href: "/tarefas", icon: ListChecks },
  { module: "alertas", label: "Alertas", href: "/alertas", icon: Bell },
  { module: "configuracoes", label: "Configurações", href: "/configuracoes", icon: Settings },
];

/** Menu inferior do mobile (item 5). O botão "Lançar" fica destacado. */
export interface MobileNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export const MOBILE_NAV: MobileNavItem[] = [
  { label: "Início", href: "/", icon: LayoutDashboard },
  { label: "Produção", href: "/producao", icon: TrendingUp },
  { label: "Lançar", href: "/lancamento", icon: PlusCircle, highlight: true },
  { label: "Alertas", href: "/alertas", icon: Bell },
  { label: "Mais", href: "/mais", icon: Settings },
];
