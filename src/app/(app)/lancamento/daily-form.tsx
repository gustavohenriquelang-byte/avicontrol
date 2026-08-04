"use client";

import { useState, useMemo, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Copy, Lock, CloudOff } from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";
import { dailyMetrics } from "@/lib/domain/daily";
import { enqueueDaily } from "@/lib/offline";
import { formatPercent, formatDecimal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Daily = Tables<"daily_records">;

export interface FlockLite {
  id: string;
  farm_id: string;
  house_id: string | null;
  code: string;
  current_quantity: number;
}

interface SubmitResult {
  ok: boolean;
  error?: string;
  difference?: number;
  status?: "draft" | "closed";
  offline?: boolean;
}

const EGG_FIELDS: { key: string; label: string }[] = [
  { key: "eggs_good", label: "Bons" },
  { key: "eggs_dirty", label: "Sujos" },
  { key: "eggs_cracked", label: "Trincados" },
  { key: "eggs_broken", label: "Quebrados" },
  { key: "eggs_deformed", label: "Deformados" },
  { key: "eggs_double_yolk", label: "Duas gemas" },
  { key: "eggs_industrial", label: "Industriais" },
  { key: "eggs_discarded", label: "Descartados" },
];

const numeric = (v: number | null | undefined) => (v == null ? "" : String(v));

function NumberField({
  name,
  label,
  value,
  onChange,
  step,
  disabled,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        inputMode={step ? "decimal" : "numeric"}
        step={step}
        disabled={disabled}
        className="h-11 text-base"
      />
    </div>
  );
}

export function DailyForm({
  flock,
  farmName,
  date,
  record,
  yesterday,
  canJustify,
}: {
  flock: FlockLite;
  farmName: string;
  date: string;
  record: Daily | null;
  yesterday: Daily | null;
  canJustify: boolean;
}) {
  const closed = record?.status === "closed";
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult>({ ok: false });

  const initial: Record<string, string> = {
    birds_start: numeric(record?.birds_start ?? flock.current_quantity),
    eggs_total: numeric(record?.eggs_total),
    eggs_good: numeric(record?.eggs_good),
    eggs_dirty: numeric(record?.eggs_dirty),
    eggs_cracked: numeric(record?.eggs_cracked),
    eggs_broken: numeric(record?.eggs_broken),
    eggs_deformed: numeric(record?.eggs_deformed),
    eggs_double_yolk: numeric(record?.eggs_double_yolk),
    eggs_industrial: numeric(record?.eggs_industrial),
    eggs_discarded: numeric(record?.eggs_discarded),
    feed_kg: numeric(record?.feed_kg),
    water_l: numeric(record?.water_l),
    mortality: numeric(record?.mortality),
    culls: numeric(record?.culls),
    temp_min: numeric(record?.temp_min),
    temp_max: numeric(record?.temp_max),
    humidity: numeric(record?.humidity),
  };
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const n = (k: string) => Number(vals[k] || 0);
  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));

  const sum = EGG_FIELDS.reduce((acc, f) => acc + n(f.key), 0);
  const diff = n("eggs_total") - sum;
  const balanced = diff === 0;

  const metrics = useMemo(
    () =>
      dailyMetrics({
        eggs_total: n("eggs_total"),
        eggs_good: n("eggs_good"),
        eggs_dirty: n("eggs_dirty"),
        eggs_cracked: n("eggs_cracked"),
        eggs_broken: n("eggs_broken"),
        eggs_deformed: n("eggs_deformed"),
        eggs_double_yolk: n("eggs_double_yolk"),
        eggs_industrial: n("eggs_industrial"),
        eggs_discarded: n("eggs_discarded"),
        birds_start: n("birds_start"),
        mortality: n("mortality"),
        culls: n("culls"),
        feed_kg: n("feed_kg"),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vals]
  );

  function repeatYesterday() {
    if (!yesterday) return;
    setVals({
      birds_start: numeric(yesterday.birds_start),
      eggs_total: numeric(yesterday.eggs_total),
      eggs_good: numeric(yesterday.eggs_good),
      eggs_dirty: numeric(yesterday.eggs_dirty),
      eggs_cracked: numeric(yesterday.eggs_cracked),
      eggs_broken: numeric(yesterday.eggs_broken),
      eggs_deformed: numeric(yesterday.eggs_deformed),
      eggs_double_yolk: numeric(yesterday.eggs_double_yolk),
      eggs_industrial: numeric(yesterday.eggs_industrial),
      eggs_discarded: numeric(yesterday.eggs_discarded),
      feed_kg: numeric(yesterday.feed_kg),
      water_l: numeric(yesterday.water_l),
      mortality: "0",
      culls: "0",
      temp_min: numeric(yesterday.temp_min),
      temp_max: numeric(yesterday.temp_max),
      humidity: numeric(yesterday.humidity),
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value === "close" ? "close" : "draft";

    const payload: Record<string, unknown> = Object.fromEntries(new FormData(form).entries());
    payload.intent = intent;
    const label = `Lote ${flock.code} · ${date}`;

    setSubmitting(true);
    setResult({ ok: false });

    const queueOffline = async () => {
      await enqueueDaily(payload, label);
      window.dispatchEvent(new Event("avicontrol:queued"));
      setResult({ ok: true, offline: true, status: intent === "close" ? "closed" : "draft" });
    };

    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await queueOffline();
      } else {
        const res = await fetch("/api/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "manual",
        });
        const data = (await res.json().catch(() => ({}))) as SubmitResult;
        if (!res.ok && !data.error) data.error = "Não foi possível salvar.";
        setResult(data);
      }
    } catch {
      // Rede caiu durante o envio → guarda offline.
      await queueOffline();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="flock_id" value={flock.id} />
      <input type="hidden" name="farm_id" value={flock.farm_id} />
      <input type="hidden" name="house_id" value={flock.house_id ?? ""} />
      <input type="hidden" name="record_date" value={date} />
      {record && <input type="hidden" name="record_id" value={record.id} />}

      {closed && (
        <div className="flex items-center gap-2 rounded-md border border-hairline bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          <Lock className="size-4" /> Lançamento fechado. Reabertura por perfil
          autorizado será adicionada em etapa futura.
        </div>
      )}
      {result.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" /> {result.error}
        </div>
      )}
      {result.ok && result.offline && (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-[#8a5d0f]">
          <CloudOff className="size-4" /> Salvo no dispositivo. Será enviado
          automaticamente quando houver internet.
        </div>
      )}
      {result.ok && !result.offline && (
        <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
          <CheckCircle2 className="size-4" />
          {result.status === "closed" ? "Dia fechado com sucesso." : "Rascunho salvo."}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>
            Lote {flock.code} · {farmName}
          </CardTitle>
          {yesterday && !closed && (
            <Button type="button" variant="outline" size="sm" onClick={repeatYesterday}>
              <Copy className="size-4" /> Repetir ontem
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <NumberField
            name="birds_start"
            label="Aves no início do dia"
            value={vals.birds_start}
            onChange={(v) => set("birds_start", v)}
            disabled={closed}
          />
          <div className="space-y-1.5">
            <Label htmlFor="collection_time" className="text-xs">
              Horário da coleta
            </Label>
            <Input
              id="collection_time"
              name="collection_time"
              type="time"
              defaultValue={record?.collection_time ?? ""}
              disabled={closed}
              className="h-11 text-base"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ovos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NumberField
            name="eggs_total"
            label="Total de ovos produzidos"
            value={vals.eggs_total}
            onChange={(v) => set("eggs_total", v)}
            disabled={closed}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EGG_FIELDS.map((f) => (
              <NumberField
                key={f.key}
                name={f.key}
                label={f.label}
                value={vals[f.key]}
                onChange={(v) => set(f.key, v)}
                disabled={closed}
              />
            ))}
          </div>

          <div
            className={
              "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm " +
              (balanced
                ? "border-brand/30 bg-brand-light text-brand-dark"
                : "border-warning/40 bg-warning/10 text-[#8a5d0f]")
            }
          >
            <span>
              Soma das classificações: <b className="tabular-nums">{sum}</b> · Total:{" "}
              <b className="tabular-nums">{n("eggs_total")}</b>
            </span>
            {balanced ? (
              <Badge variant="success">Fecha</Badge>
            ) : (
              <span className="font-medium tabular-nums">
                Diferença: {diff > 0 ? "+" : ""}
                {diff}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consumo e baixas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField name="feed_kg" label="Ração (kg)" step="0.001" value={vals.feed_kg} onChange={(v) => set("feed_kg", v)} disabled={closed} />
            <NumberField name="water_l" label="Água (L)" step="0.01" value={vals.water_l} onChange={(v) => set("water_l", v)} disabled={closed} />
            <NumberField name="mortality" label="Mortalidade" value={vals.mortality} onChange={(v) => set("mortality", v)} disabled={closed} />
            <NumberField name="culls" label="Descartes" value={vals.culls} onChange={(v) => set("culls", v)} disabled={closed} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ambiente</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField name="temp_min" label="Temp. mín. (°C)" step="0.1" value={vals.temp_min} onChange={(v) => set("temp_min", v)} disabled={closed} />
            <NumberField name="temp_max" label="Temp. máx. (°C)" step="0.1" value={vals.temp_max} onChange={(v) => set("temp_max", v)} disabled={closed} />
            <NumberField name="humidity" label="Umidade (%)" step="0.1" value={vals.humidity} onChange={(v) => set("humidity", v)} disabled={closed} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Indicadores do dia (prévia)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Taxa de postura" value={formatPercent(metrics.layingRate)} />
          <Metric label="Aves vivas" value={String(metrics.liveBirds)} />
          <Metric
            label="Ração por ave"
            value={metrics.feedPerBird == null ? "—" : `${formatDecimal(metrics.feedPerBird)} g`}
          />
          <Metric label="Aproveitamento" value={formatPercent(metrics.utilization)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={record?.notes ?? ""} disabled={closed} />
          </div>
          {!balanced && canJustify && (
            <div className="space-y-1.5">
              <Label htmlFor="adjustment_justification">
                Justificativa do ajuste (necessária para fechar com diferença)
              </Label>
              <Textarea
                id="adjustment_justification"
                name="adjustment_justification"
                defaultValue={record?.adjustment_justification ?? ""}
                disabled={closed}
                placeholder="Explique a diferença entre o total e a soma das classificações."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!closed && (
        <div className="sticky bottom-20 z-10 flex gap-3 md:bottom-4">
          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="outline"
            size="lg"
            disabled={submitting}
            className="flex-1 bg-card"
          >
            {submitting ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="close"
            size="lg"
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? "Fechando..." : "Fechar dia"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
