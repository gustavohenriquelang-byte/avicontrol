"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { saveCustomer, type FormResult } from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>;
}

export function CustomerForm({ customer }: { customer?: Tables<"customers"> }) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(saveCustomer, { ok: false });

  useEffect(() => {
    if (state.ok) router.push("/clientes");
  }, [state.ok, router]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          {customer && <input type="hidden" name="id" value={customer.id} />}
          {state.error && !state.fieldErrors && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" defaultValue={customer?.name} aria-invalid={!!fe.name} required />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc">CPF / CNPJ</Label>
              <Input id="doc" name="doc" defaultValue={customer?.doc ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" name="address" defaultValue={customer?.address ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado (UF)</Label>
              <Input id="state" name="state" maxLength={2} defaultValue={customer?.state ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Limite de crédito (R$)</Label>
              <Input id="credit_limit" name="credit_limit" type="number" step="0.01" defaultValue={customer?.credit_limit ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push("/clientes")}>Cancelar</Button>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
