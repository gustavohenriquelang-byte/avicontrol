"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Power, MoreHorizontal, KeyRound, CheckCircle2, Copy } from "lucide-react";
import { updateOrgUserRole, toggleOrgUserActive, resetUserPassword } from "./actions";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Select } from "@/components/ui/select";

export function RoleSelect({
  memberId,
  role,
  disabled,
}: {
  memberId: string;
  role: Role;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-9 w-44"
      defaultValue={role}
      disabled={disabled || pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("member_id", memberId);
        fd.set("role", e.target.value);
        start(() => updateOrgUserRole(fd));
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
  );
}

/**
 * Menu de ações do usuário: resetar senha (mostra a nova provisória) e
 * ativar/desativar.
 */
export function UserActionsMenu({
  memberId,
  userId,
  active,
}: {
  memberId: string;
  userId: string;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [newPass, setNewPass] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNewPass(null);
        setErr(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface"
        aria-label="Ações do usuário"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-hairline bg-card p-1 shadow-md">
          {newPass ? (
            <div className="p-2 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-brand-dark">
                <CheckCircle2 className="size-4" /> Nova senha provisória
              </div>
              <div className="flex items-center justify-between rounded border border-hairline bg-surface px-2 py-1">
                <code className="font-mono text-sm">{newPass}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(newPass)}
                  className="text-ink-muted hover:text-ink"
                  aria-label="Copiar"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Entregue ao usuário. Ele deve trocar depois em Meu perfil → Alterar senha.
              </p>
            </div>
          ) : (
            <>
              {err && <p className="px-3 py-2 text-xs text-destructive">{err}</p>}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await resetUserPassword(userId);
                    if (res.ok && res.password) setNewPass(res.password);
                    else setErr(res.error ?? "Erro ao redefinir.");
                  })
                }
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-ink hover:bg-surface disabled:opacity-50"
              >
                <KeyRound className="size-4" /> {pending ? "Gerando..." : "Resetar senha"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => { await toggleOrgUserActive(memberId, !active); setOpen(false); })}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-ink hover:bg-surface disabled:opacity-50"
              >
                <Power className="size-4" /> {active ? "Desativar" : "Reativar"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
