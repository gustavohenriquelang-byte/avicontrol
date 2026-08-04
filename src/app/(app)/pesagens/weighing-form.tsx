"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerWeighing, type FormResult } from "./actions";
import { parseWeights } from "@/lib/schemas";
import { weightSampleStats } from "@/lib/domain/calculations";
import { formatDecimal, formatPercent, formatInt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FlockOption {
  id: string;
  code: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar pesagem"}
    </Button>
  );
}

export function WeighingForm({ flocks, today }: { flocks: FlockOption[]; today: string }) {
  const [state, action] = useActionState<FormResult, FormData>(registerWeighing, {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setRaw("");
    }
  }, [state.ok]);

  const stats = useMemo(() => weightSampleStats(parseWeights(raw)), [raw]);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova pesagem</CardTitle>
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
              <CheckCircle2 className="size-4" /> Pesagem registrada.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="flock_id">Lote *</Label>
              <Select id="flock_id" name="flock_id" defaultValue={flocks[0]?.id ?? ""} required>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weigh_date">Data *</Label>
              <Input id="weigh_date" name="weigh_date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_days">Idade (dias)</Label>
              <Input id="age_days" name="age_days" type="number" inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weights">Pesos individuais (g)</Label>
            <Textarea
              id="weights"
              name="weights"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Cole os pesos separados por espaço, vírgula ou linha. Ex.: 1520 1490 1535 1480..."
              className="min-h-[90px] font-mono text-sm"
              aria-invalid={!!fe.weights}
              required
            />
            {fe.weights && <p className="text-xs text-destructive">{fe.weights}</p>}
          </div>

          {/* Prévia dos cálculos (item 17) */}
          {stats.count > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Amostra" value={formatInt(stats.count)} />
              <Stat label="Média" value={`${formatDecimal(stats.mean)} g`} />
              <Stat label="Desvio padrão" value={formatDecimal(stats.stdDev)} />
              <Stat label="CV" value={formatPercent(stats.cv)} />
              <Stat label="Mínimo" value={`${formatDecimal(stats.min)} g`} />
              <Stat label="Máximo" value={`${formatDecimal(stats.max)} g`} />
              <Stat
                label="Uniformidade"
                value={formatPercent(stats.uniformity)}
                highlight
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-md border px-3 py-2 " +
        (highlight ? "border-brand/30 bg-brand-light" : "border-hairline bg-surface")
      }
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={
          "text-base font-semibold tabular-nums " +
          (highlight ? "text-brand-dark" : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );
}
