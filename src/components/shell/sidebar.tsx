"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Egg, PanelLeftClose, PanelLeft } from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import type { Module } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

/** Menu lateral do desktop, recolhível (item 4). */
export function Sidebar({ allowed }: { allowed: Module[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => allowed.includes(i.module));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-hairline bg-card transition-all md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-hairline px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
          <Egg className="size-5" />
        </span>
        {!collapsed && (
          <span className="text-lg font-semibold text-ink">Avicontrol</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Menu principal">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-light text-brand-dark"
                  : "text-ink-muted hover:bg-surface hover:text-ink",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-12 items-center gap-2 border-t border-hairline px-4 text-sm text-ink-muted hover:bg-surface"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <PanelLeft className="size-5" />
        ) : (
          <>
            <PanelLeftClose className="size-5" />
            <span>Recolher</span>
          </>
        )}
      </button>
    </aside>
  );
}
