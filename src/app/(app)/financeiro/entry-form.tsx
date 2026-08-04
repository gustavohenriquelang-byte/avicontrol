"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { addFinancialEntry, type FormResult } from "./actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Category {
  id: string;
  name: string;
  kind: "receita" | "despesa";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Lançar"}</Button>;
}

export function EntryForm({ categories, today }: { categories: Category[]; today: string }) {
  const [state, action] = useActionState<FormResult, FormData>(addFinancialEntry, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"receita" | "despesa">("despesa");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setAmount("");
    }
  }, [state.ok]);

  const cats = categories.filter((c) => c.kind === type);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo lançamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={action} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          {state.ok && (
            <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              <CheckCircle2 className="size-4" /> Lançamento salvo.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="entry_type">Tipo *</Label>
              <Select id="entry_type" name="entry_type" value={type} onChange={(e) => setType(e.target.value as "receita" | "despesa")}>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria</Label>
              <Select id="category_id" name="category_id" defaultValue="">
                <option value="">—</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select id="status" name="status" defaultValue="pago">
                <option value="pago">Pago / Recebido</option>
                <option value="pendente">Pendente (a pagar/receber)</option>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input id="description" name="description" aria-invalid={!!fe.description} required />
              {fe.description && <p className="text-xs text-destructive">{fe.description}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" name="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!fe.amount} required />
              {fe.amount && <p className="text-xs text-destructive">{fe.amount}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_date">Data *</Label>
              <Input id="entry_date" name="entry_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Vencimento</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Input id="payment_method" name="payment_method" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-hairline bg-surface px-3 py-2 text-sm">
            <span className="text-ink-muted">{type === "receita" ? "Receita" : "Despesa"}</span>
            <span className={"font-semibold tabular-nums " + (type === "receita" ? "text-brand-dark" : "text-destructive")}>
              {type === "receita" ? "+" : "−"} {formatCurrency(Number(amount) || 0)}
            </span>
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
