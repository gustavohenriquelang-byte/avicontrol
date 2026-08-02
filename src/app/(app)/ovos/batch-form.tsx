"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerEggBatch, type FormResult } from "./actions";
import { EGG_QUALITY_LABELS, WEIGHT_CATEGORIES } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Option {
  id: string;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar lote"}
    </Button>
  );
}

export function BatchForm({
  farms,
  flocks,
  today,
}: {
  farms: Option[];
  flocks: Option[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(registerEggBatch, {
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
        <CardTitle>Registrar lote de ovos</CardTitle>
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
          {state.ok && state.traceCode && (
            <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              <CheckCircle2 className="size-4" /> Lote registrado:{" "}
              <b className="font-mono">{state.traceCode}</b>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="farm_id">Granja *</Label>
              <Select id="farm_id" name="farm_id" defaultValue={farms[0]?.id ?? ""} required>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flock_id">Lote de aves</Label>
              <Select id="flock_id" name="flock_id" defaultValue="">
                <option value="">—</option>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="production_date">Data de produção *</Label>
              <Input id="production_date" name="production_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Qualidade *</Label>
              <Select id="quality" name="quality" defaultValue="bom">
                {Object.entries(EGG_QUALITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_category">Categoria de peso</Label>
              <Select id="weight_category" name="weight_category" defaultValue="">
                <option value="">—</option>
                {WEIGHT_CATEGORIES.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade (unid.) *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                inputMode="numeric"
                aria-invalid={!!fe.quantity}
                required
              />
              {fe.quantity && <p className="text-xs text-destructive">{fe.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input id="location" name="location" placeholder="Câmara 1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Validade</Label>
              <Input id="expiry_date" name="expiry_date" type="date" />
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
