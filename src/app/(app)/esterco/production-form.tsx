"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerManureProduction, type FormResult } from "./actions";
import { MANURE_UNIT_LABELS, type ManureUnit } from "@/lib/domain/inventory";
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
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Registrando..." : "Registrar produção"}
    </Button>
  );
}

export function ManureProductionForm({
  farms,
  houses,
  today,
}: {
  farms: Option[];
  houses: Option[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(
    registerManureProduction,
    { ok: false }
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar produção de esterco</CardTitle>
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
              <CheckCircle2 className="size-4" /> Produção adicionada ao estoque.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="production_date">Data *</Label>
              <Input id="production_date" name="production_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm_id">Granja</Label>
              <Select id="farm_id" name="farm_id" defaultValue="">
                <option value="">—</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="house_id">Aviário</Label>
              <Select id="house_id" name="house_id" defaultValue="">
                <option value="">—</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.001"
                aria-invalid={!!fe.quantity}
                required
              />
              {fe.quantity && <p className="text-xs text-destructive">{fe.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_unit">Unidade *</Label>
              <Select id="p_unit" name="unit" defaultValue="tonelada">
                {(Object.keys(MANURE_UNIT_LABELS) as ManureUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {MANURE_UNIT_LABELS[u]}
                  </option>
                ))}
              </Select>
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
