"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { saveHouse, type FormResult } from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import { HOUSING_SYSTEM_LABELS, HOUSE_STATUS_LABELS } from "@/lib/schemas";
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

export function HouseForm({
  house,
  farms,
}: {
  house?: Tables<"houses">;
  farms: FarmOption[];
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(saveHouse, {
    ok: false,
  });

  useEffect(() => {
    if (state.ok) router.push("/aviarios");
  }, [state.ok, router]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          {house && <input type="hidden" name="id" value={house.id} />}

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
                defaultValue={house?.farm_id ?? ""}
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
              <Label htmlFor="housing_system">Sistema de criação *</Label>
              <Select
                id="housing_system"
                name="housing_system"
                defaultValue={house?.housing_system ?? "gaiolas_convencionais"}
              >
                {Object.entries(HOUSING_SYSTEM_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                name="code"
                defaultValue={house?.code}
                aria-invalid={!!fe.code}
                required
              />
              {fe.code && <p className="text-xs text-destructive">{fe.code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={house?.name}
                aria-invalid={!!fe.name}
                required
              />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade (aves)</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                inputMode="numeric"
                defaultValue={house?.capacity ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="installation_type">Tipo de instalação</Label>
              <Input
                id="installation_type"
                name="installation_type"
                defaultValue={house?.installation_type ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area_m2">Área (m²)</Label>
              <Input
                id="area_m2"
                name="area_m2"
                type="number"
                step="0.01"
                defaultValue={house?.area_m2 ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cages_count">Gaiolas / boxes</Label>
              <Input
                id="cages_count"
                name="cages_count"
                type="number"
                inputMode="numeric"
                defaultValue={house?.cages_count ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Situação *</Label>
              <Select
                id="status"
                name="status"
                defaultValue={house?.status ?? "ativo"}
              >
                {Object.entries(HOUSE_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={house?.notes ?? ""} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/aviarios")}
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
