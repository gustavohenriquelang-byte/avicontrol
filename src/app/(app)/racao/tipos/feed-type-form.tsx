"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Plus } from "lucide-react";
import { saveFeedType, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" /> {pending ? "Salvando..." : "Adicionar"}
    </Button>
  );
}

export function FeedTypeForm() {
  const [state, action] = useActionState<FormResult, FormData>(saveFeedType, {
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
        <CardTitle>Novo tipo de ração</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {state.error && (
            <div
              role="alert"
              className="flex w-full items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:hidden"
            >
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" placeholder="Ex.: Postura Fase 1" aria-invalid={!!fe.name} required />
            {fe.name && <p className="text-xs text-destructive">{fe.name}</p>}
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" />
          </div>
          <input type="hidden" name="active" value="true" />
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
