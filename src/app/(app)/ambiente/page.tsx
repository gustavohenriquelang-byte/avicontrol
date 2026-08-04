import type { Metadata } from "next";
import { Thermometer } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import { isDemoMode, demoEnvironment, demoHouses } from "@/lib/demo";
import { todayISOSaoPaulo, formatDecimal, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnvironmentForm } from "./environment-form";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Ambiente" };

type Row = Tables<"environment_records"> & { houses: { name: string } | null };

export default async function AmbientePage() {
  const { org } = await requirePermission("ambiente", "read");
  const canWrite = can(org.role, "ambiente", "write");

  let records: Row[];
  let houses: { id: string; name: string }[];

  if (isDemoMode()) {
    records = demoEnvironment;
    houses = demoHouses.map((h) => ({ id: h.id, name: h.name }));
  } else {
    const supabase = await createClient();
    const [{ data: r }, { data: h }] = await Promise.all([
      supabase
        .from("environment_records")
        .select("*, houses(name)")
        .eq("organization_id", org.organizationId)
        .order("record_date", { ascending: false })
        .limit(100),
      supabase
        .from("houses")
        .select("id, name")
        .eq("organization_id", org.organizationId)
        .eq("active", true)
        .order("name"),
    ]);
    records = (r ?? []) as unknown as Row[];
    houses = h ?? [];
  }

  return (
    <>
      <PageHeader
        title="Ambiente"
        description="Temperatura, umidade, amônia, CO₂ e luminosidade por aviário."
      />

      {canWrite && houses.length > 0 && (
        <EnvironmentForm houses={houses} today={todayISOSaoPaulo()} />
      )}

      {records.length === 0 ? (
        <EmptyState
          icon={Thermometer}
          title="Sem registros de ambiente"
          description="Registre as condições do aviário para acompanhar o conforto térmico das aves."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Aviário</TableHead>
                <TableHead className="text-right">Temp. mín/máx</TableHead>
                <TableHead className="text-right">Umidade</TableHead>
                <TableHead className="text-right">Amônia</TableHead>
                <TableHead className="text-right">CO₂</TableHead>
                <TableHead className="text-right">Horas luz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => {
                const rel = r as Row;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="tabular-nums">{formatDate(r.record_date)}</TableCell>
                    <TableCell className="font-medium">{rel.houses?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDecimal(r.temp_min)} / {formatDecimal(r.temp_max)} °C
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.humidity == null ? "—" : `${formatDecimal(r.humidity)}%`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.ammonia == null ? "—" : `${formatDecimal(r.ammonia)} ppm`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.co2 == null ? "—" : `${formatDecimal(r.co2)} ppm`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.light_hours == null ? "—" : `${formatDecimal(r.light_hours)}h`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
