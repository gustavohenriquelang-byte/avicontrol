"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerHealthEvent, type FormResult } from "./actions";
import { HEALTH_EVENT_LABELS } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Opt {
  id: string;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar evento"}
    </Button>
  );
}

export function EventForm({
  flocks,
  vaccines,
  medications,
  today,
}: {
  flocks: Opt[];
  vaccines: Opt[];
  medications: Opt[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(registerHealthEvent, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar evento sanitário</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          {state.ok && (
            <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              <CheckCircle2 className="size-4" /> Evento registrado (carência calculada quando aplicável).
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="event_type">Tipo *</Label>
              <Select id="event_type" name="event_type" defaultValue="vacinacao">
                {Object.entries(HEALTH_EVENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Data *</Label>
              <Input id="event_date" name="event_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flock_id">Lote</Label>
              <Select id="flock_id" name="flock_id" defaultValue="">
                <option value="">—</option>
                {flocks.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vaccine_id">Vacina</Label>
              <Select id="vaccine_id" name="vaccine_id" defaultValue="">
                <option value="">—</option>
                {vaccines.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medication_id">Medicamento</Label>
              <Select id="medication_id" name="medication_id" defaultValue="">
                <option value="">—</option>
                {medications.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dose">Dose</Label>
              <Input id="dose" name="dose" placeholder="Ex.: 1 dose, 10 mL/100L" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input id="responsible" name="responsible" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="description">Descrição / ocorrência</Label>
              <Input id="description" name="description" />
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
