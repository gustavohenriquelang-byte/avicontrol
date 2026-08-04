"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Plus } from "lucide-react";
import { saveMedication, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" /> {pending ? "Salvando..." : "Adicionar"}
    </Button>
  );
}

export function MedicationForm() {
  const [state, action] = useActionState<FormResult, FormData>(saveMedication, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo medicamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" aria-invalid={!!fe.name} required />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="kind">Tipo</Label>
              <Input id="kind" name="kind" placeholder="Antibiótico, vitamina..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Fabricante</Label>
              <Input id="manufacturer" name="manufacturer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal_days">Carência (dias)</Label>
              <Input id="withdrawal_days" name="withdrawal_days" type="number" inputMode="numeric" defaultValue="0" />
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
