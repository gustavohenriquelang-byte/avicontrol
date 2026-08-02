"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, UserPlus, RefreshCw } from "lucide-react";
import { createOrgUser, type FormResult } from "./actions";
import { ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <UserPlus className="size-4" /> {pending ? "Criando..." : "Criar usuário"}
    </Button>
  );
}

/** Gera uma senha temporária simples e legível. */
function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function CreateUserForm() {
  const [state, action] = useActionState<FormResult, FormData>(createOrgUser, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    setPwd(genPassword());
  }, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setPwd(genPassword());
    }
  }, [state.ok]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo usuário</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          {state.ok && (
            <div className="rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4" /> Usuário criado com sucesso!
              </div>
              <p className="mt-1">
                Entregue estes dados à pessoa. Ela pode trocar a senha depois em
                &ldquo;Esqueci a senha&rdquo;.
                {state.tempPassword && (
                  <>
                    {" "}Senha temporária:{" "}
                    <b className="font-mono">{state.tempPassword}</b>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome *</Label>
              <Input id="full_name" name="full_name" aria-invalid={!!fe.full_name} required />
              {fe.full_name && <p className="text-xs text-destructive">{fe.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" name="email" type="email" aria-invalid={!!fe.email} required />
              {fe.email && <p className="text-xs text-destructive">{fe.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de acesso *</Label>
              <Select id="role" name="role" defaultValue="operador">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha temporária *</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  name="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  aria-invalid={!!fe.password}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPwd(genPassword())}
                  aria-label="Gerar nova senha"
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
              {fe.password && <p className="text-xs text-destructive">{fe.password}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
