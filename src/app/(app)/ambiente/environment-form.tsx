"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerEnvironment, type FormResult } from "./actions";
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
      {pending ? "Salvando..." : "Registrar"}
    </Button>
  );
}

function Num({ name, label, step }: { name: string; label: string; step?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input id={name} name={name} type="number" step={step ?? "0.1"} className="h-10" />
    </div>
  );
}

export function EnvironmentForm({
  houses,
  today,
}: {
  houses: Option[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(registerEnvironment, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar ambiente</CardTitle>
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
              <CheckCircle2 className="size-4" /> Registro salvo.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="house_id" className="text-xs">
                Aviário
              </Label>
              <Select id="house_id" name="house_id" defaultValue="" className="h-10">
                <option value="">—</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record_date" className="text-xs">
                Data *
              </Label>
              <Input id="record_date" name="record_date" type="date" defaultValue={today} className="h-10" required />
            </div>
            <Num name="temp_min" label="Temp. mín. (°C)" />
            <Num name="temp_max" label="Temp. máx. (°C)" />
            <Num name="temp_current" label="Temp. atual (°C)" />
            <Num name="humidity" label="Umidade (%)" />
            <Num name="ammonia" label="Amônia (ppm)" />
            <Num name="co2" label="CO₂ (ppm)" step="1" />
            <Num name="luminosity" label="Luminosidade (lux)" step="1" />
            <Num name="light_hours" label="Horas de luz" />
            <div className="space-y-1.5">
              <Label htmlFor="ventilation" className="text-xs">
                Ventilação
              </Label>
              <Input id="ventilation" name="ventilation" className="h-10" />
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
