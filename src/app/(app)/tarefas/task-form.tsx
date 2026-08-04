"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { createTask, type FormResult } from "./actions";
import { TASK_PRIORITY_LABELS } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Option {
  id: string;
  code: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" /> {pending ? "Criando..." : "Criar tarefa"}
    </Button>
  );
}

export function TaskForm({ flocks, today }: { flocks: Option[]; today: string }) {
  const [state, action] = useActionState<FormResult, FormData>(createTask, {
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
        <CardTitle>Nova tarefa</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          <input type="hidden" name="status" value="pendente" />
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
              <CheckCircle2 className="size-4" /> Tarefa criada.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" aria-invalid={!!fe.title} required />
            {fe.title && <p className="text-xs text-destructive">{fe.title}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select id="priority" name="priority" defaultValue="media">
                {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Prazo</Label>
              <Input id="due_date" name="due_date" type="date" defaultValue={today} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flock_id">Lote (opcional)</Label>
              <Select id="flock_id" name="flock_id" defaultValue="">
                <option value="">—</option>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" />
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
