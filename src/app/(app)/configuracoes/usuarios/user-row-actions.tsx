"use client";

import { useTransition } from "react";
import { Power } from "lucide-react";
import { updateOrgUserRole, toggleOrgUserActive } from "./actions";
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

export function ActiveToggle({
  memberId,
  active,
  disabled,
}: {
  memberId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={disabled || pending}
      onClick={() => start(async () => await toggleOrgUserActive(memberId, !active))}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface disabled:opacity-50"
    >
      <Power className="size-3.5" /> {active ? "Desativar" : "Reativar"}
    </button>
  );
}
