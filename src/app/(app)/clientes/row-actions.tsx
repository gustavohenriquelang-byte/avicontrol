"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Power } from "lucide-react";
import { toggleCustomerActive } from "./actions";

export function CustomerRowActions({ id, active }: { id: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface" aria-label="Ações">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-hairline bg-card p-1 shadow-md">
          <Link href={`/clientes/${id}`} className="flex items-center gap-2 rounded px-3 py-2 text-sm text-ink hover:bg-surface">
            <Pencil className="size-4" /> Editar
          </Link>
          <button type="button" disabled={pending} onClick={() => start(async () => { await toggleCustomerActive(id, !active); setOpen(false); })} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-ink hover:bg-surface">
            <Power className="size-4" /> {active ? "Inativar" : "Reativar"}
          </button>
        </div>
      )}
    </div>
  );
}
