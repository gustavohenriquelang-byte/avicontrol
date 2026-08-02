"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { saveFarm, type FormResult } from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function FarmForm({ farm }: { farm?: Tables<"farms"> }) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(saveFarm, {
    ok: false,
  });

  useEffect(() => {
    if (state.ok) router.push("/configuracoes/granjas");
  }, [state.ok, router]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          {farm && <input type="hidden" name="id" value={farm.id} />}

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
                defaultValue={farm?.code}
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
                defaultValue={farm?.name}
                aria-invalid={!!fe.name}
                required
              />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" defaultValue={farm?.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado (UF)</Label>
              <Input
                id="state"
                name="state"
                maxLength={2}
                defaultValue={farm?.state ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={farm?.address ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={farm?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="active"
              defaultChecked={farm?.active ?? true}
              className="size-4 rounded border-hairline text-brand focus:ring-brand"
            />
            Granja ativa
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/configuracoes/granjas")}
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
