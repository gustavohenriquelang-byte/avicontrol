"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Menu inferior do mobile com botão "Lançar" central destacado (item 5). */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-hairline bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação inferior"
    >
      {MOBILE_NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative -top-4 flex flex-col items-center"
              aria-label={item.label}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-surface">
                <Icon className="size-7" />
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-brand">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
              active ? "text-brand" : "text-ink-muted"
            )}
          >
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
