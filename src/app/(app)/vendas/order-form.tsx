"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { createOrder, type FormResult } from "./actions";
import { SALES_ORDER_STATUS_LABELS } from "@/lib/schemas";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface Customer { id: string; name: string }
interface Product { id: string; name: string; price: number; classification: string | null }
interface Item {
  description: string;
  classification: string;
  quantity: string;
  unit: string;
  unit_price: string;
}

const emptyItem: Item = { description: "", classification: "", quantity: "", unit: "duzia", unit_price: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Criar pedido"}</Button>;
}

export function OrderForm({
  customers,
  products,
  today,
}: {
  customers: Customer[];
  products: Product[];
  today: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormResult, FormData>(createOrder, { ok: false });
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [discount, setDiscount] = useState("");
  const [freight, setFreight] = useState("");

  useEffect(() => {
    if (state.ok) router.push("/vendas");
  }, [state.ok, router]);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0),
    [items]
  );
  const total = subtotal - (Number(discount) || 0) + (Number(freight) || 0);

  function update(i: number, key: keyof Item, value: string) {
    setItems((arr) => arr.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }
  function applyProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setItems((arr) => arr.map((row, idx) => (idx === i ? { ...row, description: p.name, classification: p.classification ?? "", unit_price: String(p.price ?? "") } : row)));
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form action={action} className="space-y-4">
          <input type="hidden" name="items" value={JSON.stringify(items)} />

          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Cliente</Label>
              <Select id="customer_id" name="customer_id" defaultValue="">
                <option value="">—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_date">Data *</Label>
              <Input id="order_date" name="order_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select id="status" name="status" defaultValue="pedido">
                {Object.entries(SALES_ORDER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Vencimento</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((a) => [...a, { ...emptyItem }])}>
                <Plus className="size-4" /> Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-hairline p-2 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <Input list="produtos" value={item.description} onChange={(e) => update(i, "description", e.target.value)} onBlur={(e) => { const p = products.find((x) => x.name === e.target.value); if (p) applyProduct(i, p.id); }} placeholder="Produto/descrição" className="h-9" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input value={item.quantity} onChange={(e) => update(i, "quantity", e.target.value)} type="number" step="0.001" placeholder="Qtd" className="h-9" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input value={item.unit} onChange={(e) => update(i, "unit", e.target.value)} placeholder="un." className="h-9" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input value={item.unit_price} onChange={(e) => update(i, "unit_price", e.target.value)} type="number" step="0.01" placeholder="Preço" className="h-9" />
                  </div>
                  <div className="flex items-center justify-between sm:col-span-2">
                    <span className="text-sm tabular-nums text-ink-muted">
                      {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                    </span>
                    <button type="button" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} aria-label="Remover" className="text-ink-muted hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <datalist id="produtos">
              {products.map((p) => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (R$)</Label>
              <Input id="discount" name="discount" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freight">Frete (R$)</Label>
              <Input id="freight" name="freight" type="number" step="0.01" value={freight} onChange={(e) => setFreight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_method">Pagamento</Label>
              <Input id="payment_method" name="payment_method" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <div className="flex flex-col items-end gap-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm">
            <span className="text-ink-muted">Subtotal: <b className="tabular-nums text-ink">{formatCurrency(subtotal)}</b></span>
            <span className="text-base font-semibold text-ink">Total: <span className="tabular-nums">{formatCurrency(total)}</span></span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/vendas")}>Cancelar</Button>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
