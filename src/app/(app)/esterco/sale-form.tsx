"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerManureSale, type FormResult } from "./actions";
import { MANURE_UNIT_LABELS, type ManureUnit } from "@/lib/domain/inventory";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FarmOption {
  id: string;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar venda"}
    </Button>
  );
}

export function ManureSaleForm({
  farms,
  today,
}: {
  farms: FarmOption[];
  today: string;
}) {
  const [state, action] = useActionState<FormResult, FormData>(registerManureSale, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<ManureUnit>("tonelada");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setQty("");
      setPrice("");
    }
  }, [state.ok]);

  const total = (Number(qty) || 0) * (Number(price) || 0);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar venda de esterco</CardTitle>
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
              <CheckCircle2 className="size-4" /> Venda registrada como receita.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sale_date">Data *</Label>
              <Input id="sale_date" name="sale_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer">Comprador</Label>
              <Input id="buyer" name="buyer" placeholder="Nome do comprador" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farm_id">Granja</Label>
              <Select id="farm_id" name="farm_id" defaultValue="">
                <option value="">—</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.001"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                aria-invalid={!!fe.quantity}
                required
              />
              {fe.quantity && <p className="text-xs text-destructive">{fe.quantity}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                id="unit"
                name="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ManureUnit)}
              >
                {(Object.keys(MANURE_UNIT_LABELS) as ManureUnit[]).map((u) => (
                  <option key={u} value={u}>
                    {MANURE_UNIT_LABELS[u]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Preço unitário (R$) *</Label>
              <Input
                id="unit_price"
                name="unit_price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={!!fe.unit_price}
                required
              />
              {fe.unit_price && <p className="text-xs text-destructive">{fe.unit_price}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Input id="payment_method" name="payment_method" placeholder="Dinheiro, PIX, prazo..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <div className="flex items-center justify-between rounded-md border border-hairline bg-surface px-3 py-2 text-sm">
            <span className="text-ink-muted">Receita da venda</span>
            <span className="font-semibold tabular-nums text-brand-dark">
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
