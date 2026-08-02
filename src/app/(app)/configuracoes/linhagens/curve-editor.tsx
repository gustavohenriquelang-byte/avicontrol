"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { saveBreedCurve, type FormResult } from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Row {
  age_weeks: string;
  expected_laying_rate: string;
  expected_weight_g: string;
  expected_feed_g: string;
}

function toRow(c: Tables<"breed_curves">): Row {
  return {
    age_weeks: String(c.age_weeks),
    expected_laying_rate: c.expected_laying_rate?.toString() ?? "",
    expected_weight_g: c.expected_weight_g?.toString() ?? "",
    expected_feed_g: c.expected_feed_g?.toString() ?? "",
  };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar curva"}
    </Button>
  );
}

export function CurveEditor({
  breedId,
  initial,
}: {
  breedId: string;
  initial: Tables<"breed_curves">[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map(toRow)
      : [{ age_weeks: "18", expected_laying_rate: "", expected_weight_g: "", expected_feed_g: "" }]
  );
  const [state, action] = useActionState<FormResult, FormData>(saveBreedCurve, {
    ok: false,
  });

  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (state.ok) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  function update(i: number, key: keyof Row, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }
  function addRow() {
    const lastWeek = rows.length ? Number(rows[rows.length - 1].age_weeks) || 0 : 17;
    setRows((r) => [
      ...r,
      {
        age_weeks: String(lastWeek + 1),
        expected_laying_rate: "",
        expected_weight_g: "",
        expected_feed_g: "",
      },
    ]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  const chartData = rows
    .filter((r) => r.age_weeks !== "")
    .map((r) => ({
      semana: Number(r.age_weeks),
      postura: r.expected_laying_rate ? Number(r.expected_laying_rate) : null,
      peso: r.expected_weight_g ? Number(r.expected_weight_g) : null,
    }))
    .sort((a, b) => a.semana - b.semana);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Curva da linhagem</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-4" /> Adicionar semana
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-muted">
          Valores esperados por semana de idade. Servem de referência para
          comparar produção, peso e consumo reais nas próximas etapas.
        </p>

        {chartData.some((d) => d.postura != null || d.peso != null) && (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" />
                <XAxis
                  dataKey="semana"
                  tick={{ fontSize: 12, fill: "#66736C" }}
                  label={{ value: "semana", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#66736C" }}
                />
                <YAxis yAxisId="l" tick={{ fontSize: 12, fill: "#66736C" }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12, fill: "#66736C" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="postura"
                  name="Postura esperada (%)"
                  stroke="#1F6F54"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="peso"
                  name="Peso esperado (g)"
                  stroke="#E5A93D"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <form action={action}>
          <input type="hidden" name="breed_id" value={breedId} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />

          {state.error && (
            <div
              role="alert"
              className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4" /> {state.error}
            </div>
          )}
          {saved && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-2 text-sm text-brand-dark">
              <CheckCircle2 className="size-4" /> Curva salva com sucesso.
            </div>
          )}

          <div className="rounded-md border border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Semana</TableHead>
                  <TableHead>Postura (%)</TableHead>
                  <TableHead>Peso (g)</TableHead>
                  <TableHead>Consumo (g/ave)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        value={row.age_weeks}
                        onChange={(e) => update(i, "age_weeks", e.target.value)}
                        type="number"
                        inputMode="numeric"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.expected_laying_rate}
                        onChange={(e) => update(i, "expected_laying_rate", e.target.value)}
                        type="number"
                        step="0.01"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.expected_weight_g}
                        onChange={(e) => update(i, "expected_weight_g", e.target.value)}
                        type="number"
                        step="0.01"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.expected_feed_g}
                        onChange={(e) => update(i, "expected_feed_g", e.target.value)}
                        type="number"
                        step="0.01"
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        aria-label="Remover linha"
                        className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
