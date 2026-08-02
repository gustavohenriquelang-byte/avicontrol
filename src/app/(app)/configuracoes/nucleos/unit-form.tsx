"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { saveFarmUnit, type FormResult } from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
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

interface FarmOption {
  id: string;
  name: string;
}

export function UnitForm({
  unit,
  farms,
}: {
  unit?: Tables<"farm_units">;
  farms: FarmOption[];
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(saveFarmUnit, {
    ok: false,
  });

  useEffect(() => {
    if (state.ok) router.push("/configuracoes/nucleos");
  }, [state.ok, router]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          {unit && <input type="hidden" name="id" value={unit.id} />}

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
              <Label htmlFor="farm_id">Granja *</Label>
              <Select
                id="farm_id"
                name="farm_id"
                defaultValue={unit?.farm_id ?? ""}
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
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                name="code"
                defaultValue={unit?.code}
                aria-invalid={!!fe.code}
                required
              />
              {fe.code && <p className="text-xs text-destructive">{fe.code}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={unit?.name}
                aria-invalid={!!fe.name}
                placeholder="Ex.: Núcleo Postura A"
                required
              />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={unit?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="active"
              defaultChecked={unit?.active ?? true}
              className="size-4 rounded border-hairline text-brand focus:ring-brand"
            />
            Núcleo ativo
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/configuracoes/nucleos")}
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
