"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SeriesPoint {
  date: string; // DD/MM
  eggs: number;
  laying: number | null;
  mortality: number;
  feed: number;
}

const PERIODS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

export function DashboardCharts({ series }: { series: SeriesPoint[] }) {
  const [period, setPeriod] = useState(30);
  const data = series.slice(-period);

  const axis = { fontSize: 11, fill: "#66736C" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Indicadores</h2>
        <div className="flex gap-1 rounded-md border border-hairline bg-card p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={
                "rounded px-3 py-1 text-xs font-medium transition-colors " +
                (period === p.value
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-surface")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Produção de ovos por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="gEggs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F6F54" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#1F6F54" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" vertical={false} />
                  <XAxis dataKey="date" tick={axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={axis} width={44} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="eggs"
                    name="Ovos"
                    stroke="#1F6F54"
                    strokeWidth={2}
                    fill="url(#gEggs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Taxa de postura (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" vertical={false} />
                  <XAxis dataKey="date" tick={axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={axis} width={44} domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="laying"
                    name="Postura %"
                    stroke="#E5A93D"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mortalidade por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" vertical={false} />
                  <XAxis dataKey="date" tick={axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={axis} width={44} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="mortality" name="Mortalidade" fill="#D9534F" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Consumo de ração (kg/dia)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="gFeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#174C3B" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#174C3B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" vertical={false} />
                  <XAxis dataKey="date" tick={axis} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={axis} width={44} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="feed"
                    name="Ração (kg)"
                    stroke="#174C3B"
                    strokeWidth={2}
                    fill="url(#gFeed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
