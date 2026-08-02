"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { saveBreed, type FormResult } from "./actions";
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

export function BreedForm({ breed }: { breed?: Tables<"breeds"> }) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(saveBreed, {
    ok: false,
  });

  useEffect(() => {
    if (state.ok && !breed) router.push("/configuracoes/linhagens");
  }, [state.ok, breed, router]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          {breed && <input type="hidden" name="id" value={breed.id} />}

          {state.error && !state.fieldErrors && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4" />
              {state.error}
            </div>
          )}
          {state.ok && breed && (
            <div className="rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              Dados da linhagem salvos.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={breed?.name}
                aria-invalid={!!fe.name}
                placeholder="Ex.: Hy-Line W-36"
                required
              />
              {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Coloração</Label>
              <Input
                id="color"
                name="color"
                defaultValue={breed?.color ?? ""}
                placeholder="branca / vermelha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input
                id="supplier"
                name="supplier"
                defaultValue={breed?.supplier ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={breed?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="active"
              defaultChecked={breed?.active ?? true}
              className="size-4 rounded border-hairline text-brand focus:ring-brand"
            />
            Linhagem ativa
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/configuracoes/linhagens")}
            >
              Voltar
            </Button>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
