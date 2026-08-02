"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerFeedPurchase, type FormResult } from "./actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedTypeOption {
  id: string;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar compra"}
    </Button>
  );
}

export function PurchaseForm({
  feedTypes,
  today,
}: {
  feedTypes: FeedTypeOption[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(
    registerFeedPurchase,
    { ok: false }
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setQty("");
      setUnit("");
    }
  }, [state.ok]);

  const total = (Number(qty) || 0) * (Number(unit) || 0);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar compra de ração</CardTitle>
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
              <CheckCircle2 className="size-4" /> Compra registrada e estoque
              atualizado (custo médio ponderado).
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="feed_type_id">Tipo de ração *</Label>
              <Select id="feed_type_id" name="feed_type_id" defaultValue={feedTypes[0]?.id ?? ""} required>
                {feedTypes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Data *</Label>
              <Input id="purchase_date" name="purchase_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Input id="supplier" name="supplier" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice">Nota fiscal</Label>
              <Input id="invoice" name="invoice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_kg">Quantidade (kg) *</Label>
              <Input
                id="quantity_kg"
                name="quantity_kg"
                type="number"
                step="0.001"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                aria-invalid={!!fe.quantity_kg}
                required
              />
              {fe.quantity_kg && <p className="text-xs text-destructive">{fe.quantity_kg}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Custo unitário (R$/kg) *</Label>
              <Input
                id="unit_cost"
                name="unit_cost"
                type="number"
                step="0.0001"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-invalid={!!fe.unit_cost}
                required
              />
              {fe.unit_cost && <p className="text-xs text-destructive">{fe.unit_cost}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-hairline bg-surface px-3 py-2 text-sm">
            <span className="text-ink-muted">Total da compra</span>
            <span className="font-semibold tabular-nums text-ink">
              {formatCurrency(total)}
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
