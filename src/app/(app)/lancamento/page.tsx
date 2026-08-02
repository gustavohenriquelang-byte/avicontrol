import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/auth/roles";
import {
  isDemoMode,
  demoFlocks,
  demoDailyFor,
} from "@/lib/demo";
import { todayISOSaoPaulo, addDaysISO } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DailyForm, type FlockLite } from "./daily-form";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Lançamento diário" };

interface FlockOption {
  id: string;
  code: string;
  farm_id: string;
  house_id: string | null;
  current_quantity: number;
  farm_name: string;
}

export default async function LancamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ flock?: string; date?: string }>;
}) {
  const { org } = await requirePermission("lancamento", "read");
  const canWrite = can(org.role, "lancamento", "write");
  const sp = await searchParams;
  const date = sp.date || todayISOSaoPaulo();

  // Lotes disponíveis (ativos).
  let flocks: FlockOption[];
  if (isDemoMode()) {
    flocks = demoFlocks.map((f) => ({
      id: f.id,
      code: f.code,
      farm_id: f.farm_id,
      house_id: f.house_id,
      current_quantity: f.current_quantity,
      farm_name: f.farms?.name ?? "—",
    }));
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("flocks")
      .select("id, code, farm_id, house_id, current_quantity, farms(name)")
      .eq("organization_id", org.organizationId)
      .eq("active", true)
      .in("status", ["producao", "pre_postura", "muda"])
      .order("code");
    flocks = (data ?? []).map((f) => ({
      id: f.id,
      code: f.code,
      farm_id: f.farm_id,
      house_id: f.house_id,
      current_quantity: f.current_quantity,
      farm_name:
        (f as unknown as { farms: { name: string } | null }).farms?.name ?? "—",
    }));
  }

  if (flocks.length === 0) {
    return (
      <>
        <PageHeader title="Lançamento diário" description="Registro diário de produção." />
        <EmptyState
          icon={Layers}
          title="Nenhum lote em produção"
          description="Cadastre e coloque um lote em produção para lançar dados diários."
        />
      </>
    );
  }

  const selectedId = sp.flock && flocks.some((f) => f.id === sp.flock)
    ? sp.flock
    : flocks[0].id;
  const flock = flocks.find((f) => f.id === selectedId)!;

  // Registro do dia e do dia anterior.
  let record: Tables<"daily_records"> | null = null;
  let yesterday: Tables<"daily_records"> | null = null;
  const prevDate = addDaysISO(date, -1);

  if (isDemoMode()) {
    record = demoDailyFor(flock.id, date);
    yesterday = demoDailyFor(flock.id, prevDate);
  } else {
    const supabase = await createClient();
    const [{ data: rec }, { data: prev }] = await Promise.all([
      supabase
        .from("daily_records")
        .select("*")
        .eq("organization_id", org.organizationId)
        .eq("flock_id", flock.id)
        .eq("record_date", date)
        .order("status", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_records")
        .select("*")
        .eq("organization_id", org.organizationId)
        .eq("flock_id", flock.id)
        .eq("record_date", prevDate)
        .limit(1)
        .maybeSingle(),
    ]);
    record = rec;
    yesterday = prev;
  }

  const flockLite: FlockLite = {
    id: flock.id,
    farm_id: flock.farm_id,
    house_id: flock.house_id,
    code: flock.code,
    current_quantity: flock.current_quantity,
  };

  const canJustify =
    can(org.role, "lancamento", "manage") || can(org.role, "configuracoes", "write");

  return (
    <>
      <PageHeader
        title="Lançamento diário"
        description="Registro rápido de produção, ração, água, mortalidade e ambiente."
      />

      {/* Seletor de lote e data */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="flock" className="text-xs">
                Lote
              </Label>
              <Select id="flock" name="flock" defaultValue={flock.id}>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} · {f.farm_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 sm:w-44">
              <Label htmlFor="date" className="text-xs">
                Data
              </Label>
              <Input id="date" name="date" type="date" defaultValue={date} />
            </div>
            <Button type="submit" variant="outline">
              Abrir
            </Button>
          </form>
        </CardContent>
      </Card>

      {!canWrite ? (
        <Card>
          <CardContent className="p-6 text-sm text-ink-muted">
            Seu perfil tem acesso somente de leitura ao lançamento diário.
          </CardContent>
        </Card>
      ) : (
        <DailyForm
          flock={flockLite}
          farmName={flock.farm_name}
          date={date}
          record={record}
          yesterday={yesterday}
          canJustify={canJustify}
        />
      )}
    </>
  );
}
