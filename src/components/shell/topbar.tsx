"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Building2, User } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { setActiveOrg } from "@/lib/auth/org-actions";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { OfflineIndicator } from "@/components/shell/offline-indicator";
import { cn } from "@/lib/utils";

interface Membership {
  organizationId: string;
  organizationName: string;
  role: Role;
}

interface TopbarProps {
  fullName: string | null;
  email: string | null;
  activeOrg: Membership;
  memberships: Membership[];
}

export function Topbar({ fullName, email, activeOrg, memberships }: TopbarProps) {
  const [orgOpen, setOrgOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const orgRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(e.target as Node))
        setOrgOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (fullName ?? email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-hairline bg-surface/80 px-4 backdrop-blur">
      {/* Seletor de empresa */}
      <div className="relative" ref={orgRef}>
        <button
          type="button"
          onClick={() => setOrgOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md border border-hairline bg-card px-3 py-2 text-sm hover:bg-surface"
          aria-haspopup="menu"
          aria-expanded={orgOpen}
        >
          <Building2 className="size-4 text-brand" />
          <span className="max-w-[10rem] truncate font-medium text-ink">
            {activeOrg.organizationName}
          </span>
          <ChevronDown className="size-4 text-ink-muted" />
        </button>
        {orgOpen && (
          <div
            role="menu"
            className="absolute left-0 z-40 mt-1 w-64 rounded-md border border-hairline bg-card p-1 shadow-md"
          >
            {memberships.map((m) => (
              <form key={m.organizationId} action={setActiveOrg}>
                <input type="hidden" name="organizationId" value={m.organizationId} />
                <button
                  type="submit"
                  className={cn(
                    "flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-surface",
                    m.organizationId === activeOrg.organizationId && "bg-brand-light"
                  )}
                >
                  <span className="truncate text-ink">{m.organizationName}</span>
                  <span className="ml-2 text-xs text-ink-muted">
                    {ROLE_LABELS[m.role]}
                  </span>
                </button>
              </form>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <OfflineIndicator />

        {/* Menu do usuário */}
        <div className="relative" ref={userRef}>
        <button
          type="button"
          onClick={() => setUserOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full border border-hairline bg-card py-1 pl-1 pr-3 text-sm hover:bg-surface"
          aria-haspopup="menu"
          aria-expanded={userOpen}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="hidden max-w-[8rem] truncate font-medium text-ink sm:inline">
            {fullName ?? email}
          </span>
          <ChevronDown className="size-4 text-ink-muted" />
        </button>
        {userOpen && (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-hairline bg-card p-1 shadow-md"
          >
            <div className="border-b border-hairline px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">
                {fullName ?? "Usuário"}
              </p>
              <p className="truncate text-xs text-ink-muted">{email}</p>
              <p className="mt-1 text-xs text-brand">{ROLE_LABELS[activeOrg.role]}</p>
            </div>
            <a
              href="/perfil"
              className="flex items-center gap-2 rounded px-3 py-2 text-sm text-ink hover:bg-surface"
            >
              <User className="size-4" /> Meu perfil
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-destructive hover:bg-surface"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </form>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
