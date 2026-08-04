/**
 * Modo demonstração.
 *
 * Quando NEXT_PUBLIC_DEMO_MODE=true, a aplicação ignora a autenticação do
 * Supabase e usa dados fictícios em memória, permitindo navegar por toda a
 * interface sem configurar o banco. NÃO use em produção.
 */
import type { Membership, SessionContext } from "@/lib/auth/context";
import type { Tables } from "@/lib/supabase/database.types";
import { todayISOSaoPaulo, addDaysISO } from "@/lib/format";

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

export const demoOrg: Membership = {
  organizationId: DEMO_ORG_ID,
  organizationName: "Granja Modelo Avicontrol",
  role: "admin",
};

export const demoSession: SessionContext = {
  userId: "demo-user",
  email: "admin@avicontrol.local",
  fullName: "Administrador Demo",
  memberships: [demoOrg],
  activeOrg: demoOrg,
};

export const demoOrganization: Tables<"organizations"> = {
  id: DEMO_ORG_ID,
  name: "Granja Modelo Avicontrol",
  legal_name: "Granja Modelo Avicontrol Ltda.",
  tax_id: "12.345.678/0001-90",
  phone: "(18) 3111-2222",
  email: "contato@avicontrol.local",
  city: "Bastos",
  state: "SP",
  timezone: "America/Sao_Paulo",
  active: true,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const now = new Date().toISOString();

export const demoFarms: Tables<"farms">[] = [
  {
    id: "farm-1",
    organization_id: DEMO_ORG_ID,
    code: "G01",
    name: "Granja Sede",
    city: "Bastos",
    state: "SP",
    address: "Rodovia SP-294, km 12",
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "farm-2",
    organization_id: DEMO_ORG_ID,
    code: "G02",
    name: "Granja Recria",
    city: "Tupã",
    state: "SP",
    address: null,
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  },
];

type HouseWithFarm = Tables<"houses"> & { farms: { name: string } | null };

export const demoHouses: HouseWithFarm[] = [
  house("house-1", "A01", "Aviário 1", "gaiolas_convencionais", 20000, "ativo", "Granja Sede"),
  house("house-2", "A02", "Aviário 2", "cage_free", 15000, "ativo", "Granja Sede"),
  house("house-3", "A03", "Aviário 3", "free_range", 8000, "manutencao", "Granja Sede"),
  house("house-4", "A04", "Aviário Recria", "gaiolas_convencionais", 25000, "ativo", "Granja Recria"),
];

function house(
  id: string,
  code: string,
  name: string,
  system: Tables<"houses">["housing_system"],
  capacity: number,
  status: Tables<"houses">["status"],
  farmName: string
): HouseWithFarm {
  return {
    id,
    organization_id: DEMO_ORG_ID,
    farm_id: farmName === "Granja Sede" ? "farm-1" : "farm-2",
    farm_unit_id: null,
    code,
    name,
    capacity,
    installation_type: "Alvenaria",
    housing_system: system,
    area_m2: capacity / 12,
    cages_count: Math.round(capacity / 6),
    status,
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    farms: { name: farmName },
  };
}

type FlockRel = Tables<"flocks"> & {
  farms: { name: string } | null;
  houses: { name: string } | null;
  breeds: { name: string } | null;
};

export const demoFlocks: FlockRel[] = [
  flock("flock-1", "L01", 20000, 19600, "producao", "Granja Sede", "Aviário 1", "Hy-Line W-36", "2026-04-01"),
  flock("flock-2", "L02", 15000, 14850, "pre_postura", "Granja Sede", "Aviário 2", "Lohmann Brown", "2026-05-15"),
  flock("flock-3", "L03", 25000, 24700, "recria", "Granja Recria", "Aviário Recria", "Hy-Line W-36", "2026-06-20"),
];

function flock(
  id: string,
  code: string,
  initial: number,
  current: number,
  status: Tables<"flocks">["status"],
  farmName: string,
  houseName: string,
  breedName: string,
  housingDate: string
): FlockRel {
  return {
    id,
    organization_id: DEMO_ORG_ID,
    farm_id: farmName === "Granja Sede" ? "farm-1" : "farm-2",
    house_id: id,
    breed_id: "breed-1",
    code,
    supplier: "Incubatório Regional",
    birth_date: "2025-12-01",
    housing_date: housingDate,
    initial_quantity: initial,
    current_quantity: current,
    age_at_housing_days: 120,
    acquisition_cost: initial * 18.5,
    initial_avg_weight_g: 1250,
    expected_laying_start: "2026-05-01",
    expected_cull_date: "2027-08-01",
    status,
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    farms: { name: farmName },
    houses: { name: houseName },
    breeds: { name: breedName },
  };
}

export const demoBreeds: Tables<"breeds">[] = [
  {
    id: "breed-1",
    organization_id: DEMO_ORG_ID,
    name: "Hy-Line W-36",
    supplier: "Hy-Line do Brasil",
    color: "branca",
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "breed-2",
    organization_id: DEMO_ORG_ID,
    name: "Lohmann Brown",
    supplier: "Lohmann Brasil",
    color: "vermelha",
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  },
];

type UnitWithFarm = Tables<"farm_units"> & { farms: { name: string } | null };

export const demoUnits: UnitWithFarm[] = [
  {
    id: "unit-1",
    organization_id: DEMO_ORG_ID,
    farm_id: "farm-1",
    code: "N01",
    name: "Núcleo Postura A",
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    farms: { name: "Granja Sede" },
  },
  {
    id: "unit-2",
    organization_id: DEMO_ORG_ID,
    farm_id: "farm-2",
    code: "N02",
    name: "Núcleo Recria",
    notes: null,
    active: true,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    farms: { name: "Granja Recria" },
  },
];

/** Curva de demonstração (semanas 18–30) para a primeira linhagem. */
export const demoBreedCurve: Tables<"breed_curves">[] = Array.from(
  { length: 13 },
  (_, i) => {
    const w = 18 + i;
    return {
      id: `curve-${w}`,
      organization_id: DEMO_ORG_ID,
      breed_id: "breed-1",
      age_weeks: w,
      expected_laying_rate: Math.min(95, Math.max(0, (w - 18) * 12)),
      expected_weight_g: 1200 + (w - 18) * 25,
      expected_feed_g: 95 + (w - 18) * 2,
      created_at: now,
      updated_at: now,
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Lançamentos diários de demonstração (90 dias)                              */
/* -------------------------------------------------------------------------- */

const DEMO_TODAY = todayISOSaoPaulo();

// PRNG determinístico simples para dados estáveis entre renders.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildDaily(
  flockId: string,
  farmId: string,
  houseId: string,
  birds: number,
  dayOffset: number,
  layingBase: number
): Tables<"daily_records"> {
  const rand = rng(dayOffset * 7 + flockId.length * 131);
  const date = addDaysISO(DEMO_TODAY, -dayOffset);
  const rate = Math.max(0, Math.min(98, layingBase + (rand() - 0.5) * 6));
  const total = Math.round((birds * rate) / 100);

  // Classificação: define as perdas e calcula "bons" para fechar exatamente.
  const dirty = Math.round(total * 0.03);
  const cracked = Math.round(total * 0.02);
  const broken = Math.round(total * 0.008);
  const deformed = Math.round(total * 0.004);
  const doubleYolk = Math.round(total * 0.003);
  const industrial = Math.round(total * 0.006);
  const discarded = Math.round(total * 0.003);
  const good = total - (dirty + cracked + broken + deformed + doubleYolk + industrial + discarded);

  const mortality = Math.round(rand() * 4);
  const feed = Math.round(birds * 0.112 * 100) / 100;

  return {
    id: `daily-${flockId}-${dayOffset}`,
    organization_id: DEMO_ORG_ID,
    farm_id: farmId,
    house_id: houseId,
    flock_id: flockId,
    record_date: date,
    collection_time: "08:30:00",
    birds_start: birds,
    eggs_total: total,
    eggs_good: good,
    eggs_dirty: dirty,
    eggs_cracked: cracked,
    eggs_broken: broken,
    eggs_deformed: deformed,
    eggs_double_yolk: doubleYolk,
    eggs_industrial: industrial,
    eggs_discarded: discarded,
    feed_kg: feed,
    water_l: Math.round(birds * 0.22),
    mortality,
    culls: 0,
    temp_min: Math.round((18 + rand() * 3) * 10) / 10,
    temp_max: Math.round((26 + rand() * 4) * 10) / 10,
    humidity: Math.round((60 + rand() * 15) * 10) / 10,
    notes: null,
    status: "closed",
    adjustment_justification: null,
    created_by: "demo-user",
    closed_by: "demo-user",
    closed_at: `${date}T11:30:00Z`,
    created_at: `${date}T11:30:00Z`,
    updated_at: `${date}T11:30:00Z`,
  };
}

// flock-1 em produção: 90 dias fechados (até ontem). flock-2 pré-postura:
// últimos 20 dias com postura baixa subindo. Hoje fica em aberto p/ lançar.
export const demoDailyRecords: Tables<"daily_records">[] = [
  ...Array.from({ length: 90 }, (_, i) =>
    buildDaily("flock-1", "farm-1", "house-1", 19600, i + 1, 90)
  ),
  ...Array.from({ length: 20 }, (_, i) =>
    buildDaily("flock-2", "farm-1", "house-2", 14850, i + 1, Math.max(5, 55 - i * 2))
  ),
];

export function demoDailyFor(
  flockId: string,
  date: string
): Tables<"daily_records"> | null {
  return demoDailyRecords.find((r) => r.flock_id === flockId && r.record_date === date) ?? null;
}

export function demoDailySeries(flockId: string): Tables<"daily_records">[] {
  return demoDailyRecords
    .filter((r) => r.flock_id === flockId)
    .sort((a, b) => a.record_date.localeCompare(b.record_date));
}

/* -------------------------------------------------------------------------- */
/* Estoque de ração e de ovos (Etapa 4)                                        */
/* -------------------------------------------------------------------------- */

export const demoFeedTypes: Tables<"feed_types">[] = [
  { id: "feed-1", organization_id: DEMO_ORG_ID, name: "Postura Fase 1", description: "Ração de postura pico", notes: null, active: true, deleted_at: null, created_at: now, updated_at: now },
  { id: "feed-2", organization_id: DEMO_ORG_ID, name: "Postura Fase 2", description: "Ração de postura tardia", notes: null, active: true, deleted_at: null, created_at: now, updated_at: now },
  { id: "feed-3", organization_id: DEMO_ORG_ID, name: "Recria", description: "Ração de recria", notes: null, active: true, deleted_at: null, created_at: now, updated_at: now },
];

type FeedInvRow = Tables<"feed_inventory"> & { feed_types: { name: string } | null };
export const demoFeedInventory: FeedInvRow[] = [
  { id: "finv-1", organization_id: DEMO_ORG_ID, feed_type_id: "feed-1", quantity_kg: 48250, avg_cost: 2.34, updated_at: now, feed_types: { name: "Postura Fase 1" } },
  { id: "finv-2", organization_id: DEMO_ORG_ID, feed_type_id: "feed-2", quantity_kg: 22100, avg_cost: 2.21, updated_at: now, feed_types: { name: "Postura Fase 2" } },
  { id: "finv-3", organization_id: DEMO_ORG_ID, feed_type_id: "feed-3", quantity_kg: 9800, avg_cost: 2.58, updated_at: now, feed_types: { name: "Recria" } },
];

type FeedMovRow = Tables<"feed_movements"> & { feed_types: { name: string } | null };
export const demoFeedMovements: FeedMovRow[] = [
  { id: "fmov-1", organization_id: DEMO_ORG_ID, feed_type_id: "feed-1", farm_id: "farm-1", movement_type: "compra", movement_date: addDaysISO(DEMO_TODAY, -3), quantity_kg: 30000, unit_cost: 2.30, reference: "NF 10231", notes: null, created_by: "demo-user", created_at: now, feed_types: { name: "Postura Fase 1" } },
  { id: "fmov-2", organization_id: DEMO_ORG_ID, feed_type_id: "feed-1", farm_id: "farm-1", movement_type: "consumo", movement_date: addDaysISO(DEMO_TODAY, -1), quantity_kg: -2195, unit_cost: 2.34, reference: null, notes: null, created_by: "demo-user", created_at: now, feed_types: { name: "Postura Fase 1" } },
  { id: "fmov-3", organization_id: DEMO_ORG_ID, feed_type_id: "feed-2", farm_id: "farm-1", movement_type: "compra", movement_date: addDaysISO(DEMO_TODAY, -8), quantity_kg: 25000, unit_cost: 2.21, reference: "NF 10198", notes: null, created_by: "demo-user", created_at: now, feed_types: { name: "Postura Fase 2" } },
];

type EggInvRow = Tables<"egg_inventory"> & {
  farms: { name: string } | null;
  flocks: { code: string } | null;
};
export const demoEggInventory: EggInvRow[] = [
  eggBatch("einv-1", "G01", "L01", addDaysISO(DEMO_TODAY, -1), "bom", "Grande", 15800, "Câmara 1"),
  eggBatch("einv-2", "G01", "L01", addDaysISO(DEMO_TODAY, -1), "bom", "Médio", 8200, "Câmara 1"),
  eggBatch("einv-3", "G01", "L02", addDaysISO(DEMO_TODAY, -2), "sujo", "Grande", 512, "Câmara 2"),
  eggBatch("einv-4", "G01", "L01", addDaysISO(DEMO_TODAY, -2), "industrial", null, 102, "Câmara 2"),
];

function eggBatch(
  id: string,
  farmCode: string,
  flockCode: string,
  prodDate: string,
  quality: Tables<"egg_inventory">["quality"],
  weight: string | null,
  qty: number,
  location: string
): EggInvRow {
  const seq = id.slice(-1).padStart(3, "0");
  return {
    id,
    organization_id: DEMO_ORG_ID,
    farm_id: "farm-1",
    flock_id: flockCode === "L01" ? "flock-1" : "flock-2",
    location,
    production_date: prodDate,
    quality,
    weight_category: weight,
    quantity: qty,
    expiry_date: addDaysISO(prodDate, 28),
    trace_code: `OVO-${prodDate}-${farmCode}-${flockCode}-${seq}`,
    notes: null,
    created_at: now,
    updated_at: now,
    farms: { name: "Granja Sede" },
    flocks: { code: flockCode },
  };
}

export const demoManureProduction: Tables<"manure_production">[] = [
  { id: "mprod-1", organization_id: DEMO_ORG_ID, farm_id: "farm-1", house_id: "house-1", flock_id: "flock-1", production_date: addDaysISO(DEMO_TODAY, -20), quantity: 40, unit: "tonelada", quantity_kg: 40000, notes: "Retirada aviário 1", created_by: "demo-user", created_at: now },
  { id: "mprod-2", organization_id: DEMO_ORG_ID, farm_id: "farm-1", house_id: "house-2", flock_id: "flock-2", production_date: addDaysISO(DEMO_TODAY, -8), quantity: 28, unit: "tonelada", quantity_kg: 28000, notes: null, created_by: "demo-user", created_at: now },
];

type ManureSaleRow = Tables<"manure_sales"> & { farms: { name: string } | null };
export const demoManureSales: ManureSaleRow[] = [
  { id: "msale-1", organization_id: DEMO_ORG_ID, farm_id: "farm-1", sale_date: addDaysISO(DEMO_TODAY, -15), buyer: "Sítio Boa Vista", quantity: 12, unit: "tonelada", quantity_kg: 12000, unit_price: 180, total: 2160, payment_method: "PIX", notes: null, created_by: "demo-user", created_at: now, farms: { name: "Granja Sede" } },
  { id: "msale-2", organization_id: DEMO_ORG_ID, farm_id: "farm-1", sale_date: addDaysISO(DEMO_TODAY, -6), buyer: "Fazenda Santa Rita", quantity: 20, unit: "tonelada", quantity_kg: 20000, unit_price: 175, total: 3500, payment_method: "Prazo 30d", notes: null, created_by: "demo-user", created_at: now, farms: { name: "Granja Sede" } },
  { id: "msale-3", organization_id: DEMO_ORG_ID, farm_id: "farm-1", sale_date: addDaysISO(DEMO_TODAY, -1), buyer: "Agropecuária Vale Verde", quantity: 8, unit: "tonelada", quantity_kg: 8000, unit_price: 185, total: 1480, payment_method: "Dinheiro", notes: null, created_by: "demo-user", created_at: now, farms: { name: "Granja Sede" } },
];

type WeighRow = Tables<"bird_weights"> & { flocks: { code: string } | null };
export const demoWeighings: WeighRow[] = [
  weigh("bw-1", "flock-1", addDaysISO(DEMO_TODAY, -2), 210, 1520, 1385, 1640, 58.2, 3.83, 88.5, 1500),
  weigh("bw-2", "flock-1", addDaysISO(DEMO_TODAY, -30), 182, 1410, 1250, 1560, 62.1, 4.4, 85.0, 1400),
  weigh("bw-3", "flock-2", addDaysISO(DEMO_TODAY, -5), 133, 1180, 1040, 1320, 55.0, 4.66, 82.3, 1225),
];

function weigh(
  id: string,
  flockId: string,
  date: string,
  ageDays: number,
  mean: number,
  min: number,
  max: number,
  std: number,
  cv: number,
  uniformity: number,
  expected: number
): WeighRow {
  return {
    id,
    organization_id: DEMO_ORG_ID,
    flock_id: flockId,
    weigh_date: date,
    age_days: ageDays,
    sample_size: 100,
    mean_g: mean,
    min_g: min,
    max_g: max,
    std_dev: std,
    cv,
    uniformity,
    expected_g: expected,
    samples: null,
    notes: null,
    created_by: "demo-user",
    created_at: now,
    flocks: { code: flockId === "flock-1" ? "L01" : "L02" },
  };
}

type EnvRow = Tables<"environment_records"> & { houses: { name: string } | null };
export const demoEnvironment: EnvRow[] = [
  { id: "env-1", organization_id: DEMO_ORG_ID, farm_id: "farm-1", house_id: "house-1", record_date: addDaysISO(DEMO_TODAY, -1), temp_min: 19.4, temp_max: 28.1, temp_current: 24.2, humidity: 66, ammonia: 12, co2: 1800, luminosity: 40, light_hours: 16, ventilation: "Automática", notes: null, created_by: "demo-user", created_at: now, houses: { name: "Aviário 1" } },
  { id: "env-2", organization_id: DEMO_ORG_ID, farm_id: "farm-1", house_id: "house-2", record_date: addDaysISO(DEMO_TODAY, -1), temp_min: 20.1, temp_max: 29.0, temp_current: 25.0, humidity: 70, ammonia: 18, co2: 2100, luminosity: 35, light_hours: 16, ventilation: "Manual", notes: null, created_by: "demo-user", created_at: now, houses: { name: "Aviário 2" } },
];

export const demoTasks: (Tables<"tasks"> & { flocks: { code: string } | null })[] = [
  { id: "task-1", organization_id: DEMO_ORG_ID, title: "Vacinar lote L02 (Newcastle)", description: "Aplicar via água", farm_id: "farm-1", house_id: null, flock_id: "flock-2", assigned_to: null, priority: "alta", due_date: addDaysISO(DEMO_TODAY, 2), recurrence: null, status: "pendente", created_by: "demo-user", created_at: now, updated_at: now, flocks: { code: "L02" } },
  { id: "task-2", organization_id: DEMO_ORG_ID, title: "Limpeza do reservatório de água", description: null, farm_id: "farm-1", house_id: null, flock_id: null, assigned_to: null, priority: "media", due_date: addDaysISO(DEMO_TODAY, 5), recurrence: "Mensal", status: "em_andamento", created_by: "demo-user", created_at: now, updated_at: now, flocks: null },
  { id: "task-3", organization_id: DEMO_ORG_ID, title: "Conferir estoque de ração", description: null, farm_id: "farm-1", house_id: null, flock_id: null, assigned_to: null, priority: "baixa", due_date: addDaysISO(DEMO_TODAY, -1), recurrence: null, status: "concluida", created_by: "demo-user", created_at: now, updated_at: now, flocks: null },
];

export const demoVaccines: Tables<"vaccines">[] = [
  { id: "vac-1", organization_id: DEMO_ORG_ID, name: "Newcastle (La Sota)", manufacturer: "Zoetis", target_disease: "Doença de Newcastle", route: "Água de bebida", doses: 1, withdrawal_days: 0, notes: null, active: true, created_at: now, updated_at: now },
  { id: "vac-2", organization_id: DEMO_ORG_ID, name: "Bouba Aviária", manufacturer: "MSD", target_disease: "Varíola aviária", route: "Punctura de asa", doses: 1, withdrawal_days: 0, notes: null, active: true, created_at: now, updated_at: now },
];

export const demoMedications: Tables<"medications">[] = [
  { id: "med-1", organization_id: DEMO_ORG_ID, name: "Enrofloxacina 10%", manufacturer: "Ourofino", kind: "Antibiótico", withdrawal_days: 7, notes: null, active: true, created_at: now, updated_at: now },
  { id: "med-2", organization_id: DEMO_ORG_ID, name: "Complexo vitamínico", manufacturer: "Vetnil", kind: "Vitamina", withdrawal_days: 0, notes: null, active: true, created_at: now, updated_at: now },
];

type HealthRow = Tables<"health_events"> & {
  flocks: { code: string } | null;
  vaccines: { name: string } | null;
  medications: { name: string } | null;
};
export const demoHealthEvents: HealthRow[] = [
  { id: "he-1", organization_id: DEMO_ORG_ID, flock_id: "flock-1", house_id: null, event_date: addDaysISO(DEMO_TODAY, -10), event_type: "vacinacao", vaccine_id: "vac-1", medication_id: null, description: "Reforço Newcastle", dose: "1 dose", responsible: "Téc. João", withdrawal_until: null, notes: null, created_by: "demo-user", created_at: now, flocks: { code: "L01" }, vaccines: { name: "Newcastle (La Sota)" }, medications: null },
  { id: "he-2", organization_id: DEMO_ORG_ID, flock_id: "flock-2", house_id: null, event_date: addDaysISO(DEMO_TODAY, -4), event_type: "medicacao", vaccine_id: null, medication_id: "med-1", description: "Tratamento respiratório", dose: "10 mL/100L", responsible: "Vet. Ana", withdrawal_until: addDaysISO(DEMO_TODAY, 3), notes: null, created_by: "demo-user", created_at: now, flocks: { code: "L02" }, vaccines: null, medications: { name: "Enrofloxacina 10%" } },
];

type SchedRow = Tables<"vaccination_schedules"> & {
  flocks: { code: string } | null;
  vaccines: { name: string } | null;
};
export const demoSchedules: SchedRow[] = [
  { id: "sc-1", organization_id: DEMO_ORG_ID, flock_id: "flock-2", vaccine_id: "vac-1", scheduled_date: addDaysISO(DEMO_TODAY, 3), status: "programada", applied_date: null, responsible: null, notes: null, created_at: now, updated_at: now, flocks: { code: "L02" }, vaccines: { name: "Newcastle (La Sota)" } },
  { id: "sc-2", organization_id: DEMO_ORG_ID, flock_id: "flock-1", vaccine_id: "vac-2", scheduled_date: addDaysISO(DEMO_TODAY, -2), status: "atrasada", applied_date: null, responsible: null, notes: null, created_at: now, updated_at: now, flocks: { code: "L01" }, vaccines: { name: "Bouba Aviária" } },
];

/** Métricas agregadas para o dashboard em modo demo. */
export const demoOverview = {
  farms: demoFarms.length,
  houses: demoHouses.filter((h) => h.status === "ativo").length,
  flocks: demoFlocks.length,
  liveBirds: demoFlocks.reduce((s, f) => s + f.current_quantity, 0),
};
