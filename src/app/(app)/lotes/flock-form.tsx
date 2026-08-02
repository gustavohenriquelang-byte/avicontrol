"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { saveFlock, type FormResult } from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import { FLOCK_STATUS_LABELS } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

interface Option {
  id: string;
  name: string;
}

export function FlockForm({
  flock,
  farms,
  houses,
  breeds,
}: {
  flock?: Tables<"flocks">;
  farms: Option[];
  houses: Option[];
  breeds: Option[];
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(saveFlock, {
    ok: false,
  });

  useEffect(() => {
    if (state.ok) router.push("/lotes");
  }, [state.ok, router]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          {flock && <input type="hidden" name="id" value={flock.id} />}

          {state.error && !state.fieldErrors && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4" />
              {state.error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                name="code"
                defaultValue={flock?.code}
                aria-invalid={!!fe.code}
                required
              />
              {fe.code && <p className="text-xs text-destructive">{fe.code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                id="status"
                name="status"
                defaultValue={flock?.status ?? "recria"}
              >
                {Object.entries(FLOCK_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm_id">Granja *</Label>
              <Select
                id="farm_id"
                name="farm_id"
                defaultValue={flock?.farm_id ?? ""}
                aria-invalid={!!fe.farm_id}
                required
              >
                <option value="">Selecione...</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              {fe.farm_id && (
                <p className="text-xs text-destructive">{fe.farm_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="house_id">Aviário</Label>
              <Select
                id="house_id"
                name="house_id"
                defaultValue={flock?.house_id ?? ""}
              >
                <option value="">Selecione...</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed_id">Linhagem</Label>
              <Select
                id="breed_id"
                name="breed_id"
                defaultValue={flock?.breed_id ?? ""}
              >
                <option value="">Selecione...</option>
                {breeds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                name="supplier"
                defaultValue={flock?.supplier ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                defaultValue={flock?.birth_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="housing_date">Data de alojamento</Label>
              <Input
                id="housing_date"
                name="housing_date"
                type="date"
                defaultValue={flock?.housing_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_quantity">Quantidade inicial *</Label>
              <Input
                id="initial_quantity"
                name="initial_quantity"
                type="number"
                inputMode="numeric"
                defaultValue={flock?.initial_quantity ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_quantity">Quantidade atual</Label>
              <Input
                id="current_quantity"
                name="current_quantity"
                type="number"
                inputMode="numeric"
                defaultValue={flock?.current_quantity ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_at_housing_days">Idade no alojamento (dias)</Label>
              <Input
                id="age_at_housing_days"
                name="age_at_housing_days"
                type="number"
                inputMode="numeric"
                defaultValue={flock?.age_at_housing_days ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acquisition_cost">Custo de aquisição (R$)</Label>
              <Input
                id="acquisition_cost"
                name="acquisition_cost"
                type="number"
                step="0.01"
                defaultValue={flock?.acquisition_cost ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_avg_weight_g">Peso médio inicial (g)</Label>
              <Input
                id="initial_avg_weight_g"
                name="initial_avg_weight_g"
                type="number"
                step="0.01"
                defaultValue={flock?.initial_avg_weight_g ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_laying_start">Início previsto da postura</Label>
              <Input
                id="expected_laying_start"
                name="expected_laying_start"
                type="date"
                defaultValue={flock?.expected_laying_start ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_cull_date">Descarte previsto</Label>
              <Input
                id="expected_cull_date"
                name="expected_cull_date"
                type="date"
                defaultValue={flock?.expected_cull_date ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={flock?.notes ?? ""} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/lotes")}
            >
              Cancelar
            </Button>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
