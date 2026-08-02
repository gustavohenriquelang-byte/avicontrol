"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { saveMortality, type FormResult } from "./actions";
import { MORTALITY_REASON_LABELS } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FlockOption {
  id: string;
  code: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar"}
    </Button>
  );
}

export function MortalityForm({
  flocks,
  today,
}: {
  flocks: FlockOption[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(saveMortality, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar mortalidade</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          {state.ok && (
            <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              <CheckCircle2 className="size-4" /> Mortalidade registrada.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="flock_id">Lote *</Label>
              <Select id="flock_id" name="flock_id" defaultValue={flocks[0]?.id ?? ""} required>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code}
                  </option>
                ))}
              </Select>
              {fe.flock_id && <p className="text-xs text-destructive">{fe.flock_id}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="record_date">Data *</Label>
              <Input id="record_date" name="record_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                required
                aria-invalid={!!fe.quantity}
              />
              {fe.quantity && <p className="text-xs text-destructive">{fe.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Select id="reason" name="reason" defaultValue="desconhecida">
                {Object.entries(MORTALITY_REASON_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input id="responsible" name="responsible" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cause_note">Causa provável</Label>
              <Input id="cause_note" name="cause_note" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
