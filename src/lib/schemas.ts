import { z } from "zod";

/** Converte "" em undefined (campos opcionais de formulário). */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isNaN(n) ? undefined : n;
  });

export const farmSchema = z.object({
  code: z.string().trim().min(1, "Código é obrigatório").max(20),
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  city: optionalText,
  state: optionalText,
  address: optionalText,
  notes: optionalText,
  active: z.coerce.boolean().default(true),
});
export type FarmInput = z.infer<typeof farmSchema>;

export const farmUnitSchema = z.object({
  farm_id: z.string().uuid("Selecione a granja"),
  code: z.string().trim().min(1, "Código é obrigatório").max(20),
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  notes: optionalText,
  active: z.coerce.boolean().default(true),
});
export type FarmUnitInput = z.infer<typeof farmUnitSchema>;

export const breedSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  supplier: optionalText,
  color: optionalText,
  notes: optionalText,
  active: z.coerce.boolean().default(true),
});
export type BreedInput = z.infer<typeof breedSchema>;

/** Uma linha da curva da linhagem (por semana de idade). */
export const breedCurveRowSchema = z.object({
  age_weeks: z.coerce.number().int().min(0, "Idade inválida").max(120),
  expected_laying_rate: optionalNumber,
  expected_weight_g: optionalNumber,
  expected_feed_g: optionalNumber,
});
export type BreedCurveRowInput = z.infer<typeof breedCurveRowSchema>;

export const houseSchema = z.object({
  farm_id: z.string().uuid("Selecione a granja"),
  farm_unit_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  code: z.string().trim().min(1, "Código é obrigatório").max(20),
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  capacity: optionalNumber,
  installation_type: optionalText,
  housing_system: z.enum([
    "gaiolas_convencionais",
    "cage_free",
    "free_range",
    "caipira",
    "organico",
    "outro",
  ]),
  area_m2: optionalNumber,
  cages_count: optionalNumber,
  status: z.enum(["ativo", "inativo", "manutencao", "vazio_sanitario"]),
  notes: optionalText,
});
export type HouseInput = z.infer<typeof houseSchema>;

export const flockSchema = z.object({
  farm_id: z.string().uuid("Selecione a granja"),
  house_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  breed_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  code: z.string().trim().min(1, "Código é obrigatório").max(20),
  supplier: optionalText,
  birth_date: optionalText,
  housing_date: optionalText,
  initial_quantity: optionalNumber,
  current_quantity: optionalNumber,
  age_at_housing_days: optionalNumber,
  acquisition_cost: optionalNumber,
  initial_avg_weight_g: optionalNumber,
  expected_laying_start: optionalText,
  expected_cull_date: optionalText,
  status: z.enum([
    "recria",
    "pre_postura",
    "producao",
    "muda",
    "encerrado",
    "vazio_sanitario",
  ]),
  notes: optionalText,
});
export type FlockInput = z.infer<typeof flockSchema>;

const num0 = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return 0;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  });

export const dailySchema = z.object({
  flock_id: z.string().uuid("Selecione o lote"),
  farm_id: z.string().uuid(),
  house_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  collection_time: optionalText,
  birds_start: num0,
  eggs_total: num0,
  eggs_good: num0,
  eggs_dirty: num0,
  eggs_cracked: num0,
  eggs_broken: num0,
  eggs_deformed: num0,
  eggs_double_yolk: num0,
  eggs_industrial: num0,
  eggs_discarded: num0,
  feed_kg: num0,
  water_l: num0,
  mortality: num0,
  culls: num0,
  temp_min: optionalNumber,
  temp_max: optionalNumber,
  humidity: optionalNumber,
  notes: optionalText,
  adjustment_justification: optionalText,
});
export type DailyInputSchema = z.infer<typeof dailySchema>;

export const mortalitySchema = z.object({
  flock_id: z.string().uuid("Selecione o lote"),
  house_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quantity: z.coerce.number().int().min(1, "Informe a quantidade"),
  reason: z.enum([
    "desconhecida",
    "doenca",
    "acidente",
    "canibalismo",
    "locomotor",
    "respiratorio",
    "baixa_produtividade",
    "descarte_sanitario",
    "outro",
  ]),
  cause_note: optionalText,
  responsible: optionalText,
  notes: optionalText,
});
export type MortalityInput = z.infer<typeof mortalitySchema>;

export const MORTALITY_REASON_LABELS: Record<string, string> = {
  desconhecida: "Desconhecida",
  doenca: "Doença",
  acidente: "Acidente",
  canibalismo: "Canibalismo",
  locomotor: "Problema locomotor",
  respiratorio: "Problema respiratório",
  baixa_produtividade: "Baixa produtividade",
  descarte_sanitario: "Descarte sanitário",
  outro: "Outro",
};

export const feedTypeSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  description: optionalText,
  active: z.coerce.boolean().default(true),
});
export type FeedTypeInput = z.infer<typeof feedTypeSchema>;

export const feedPurchaseSchema = z.object({
  feed_type_id: z.string().uuid("Selecione o tipo de ração"),
  farm_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  supplier: optionalText,
  quantity_kg: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  unit_cost: z.coerce.number().min(0, "Custo inválido"),
  invoice: optionalText,
  notes: optionalText,
});
export type FeedPurchaseInput = z.infer<typeof feedPurchaseSchema>;

export const eggBatchSchema = z.object({
  farm_id: z.string().uuid("Selecione a granja"),
  flock_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  location: optionalText,
  production_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quality: z.enum([
    "bom",
    "sujo",
    "trincado",
    "quebrado",
    "deformado",
    "industrial",
    "descartado",
  ]),
  weight_category: optionalText,
  quantity: z.coerce.number().int().positive("Quantidade deve ser maior que zero"),
  expiry_date: optionalText,
  notes: optionalText,
});
export type EggBatchInput = z.infer<typeof eggBatchSchema>;

export const EGG_QUALITY_LABELS: Record<string, string> = {
  bom: "Bom",
  sujo: "Sujo",
  trincado: "Trincado",
  quebrado: "Quebrado",
  deformado: "Deformado",
  industrial: "Industrial",
  descartado: "Descartado",
};

export const WEIGHT_CATEGORIES = ["Pequeno", "Médio", "Grande", "Extra", "Jumbo"];

export const FEED_MOVEMENT_LABELS: Record<string, string> = {
  compra: "Compra",
  consumo: "Consumo",
  transferencia: "Transferência",
  perda: "Perda",
  ajuste: "Ajuste",
  inventario: "Inventário",
};

const manureUnit = z.enum(["kg", "tonelada", "saco", "big_bag", "m3"]);

export const manureProductionSchema = z.object({
  farm_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  house_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  flock_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  production_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  unit: manureUnit,
  notes: optionalText,
});
export type ManureProductionInput = z.infer<typeof manureProductionSchema>;

export const manureSaleSchema = z.object({
  farm_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  buyer: optionalText,
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  unit: manureUnit,
  unit_price: z.coerce.number().min(0, "Preço inválido"),
  payment_method: optionalText,
  notes: optionalText,
});
export type ManureSaleInput = z.infer<typeof manureSaleSchema>;

export const EGG_MOVEMENT_LABELS: Record<string, string> = {
  producao: "Produção",
  classificacao: "Classificação",
  transferencia: "Transferência",
  venda: "Venda",
  descarte: "Descarte",
  ajuste: "Ajuste",
  inventario: "Inventário",
};

/** Rótulos legíveis para enums usados em selects. */
export const HOUSING_SYSTEM_LABELS: Record<string, string> = {
  gaiolas_convencionais: "Gaiolas convencionais",
  cage_free: "Cage-free",
  free_range: "Free-range",
  caipira: "Caipira",
  organico: "Orgânico",
  outro: "Outro",
};

export const HOUSE_STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  manutencao: "Manutenção",
  vazio_sanitario: "Vazio sanitário",
};

export const FLOCK_STATUS_LABELS: Record<string, string> = {
  recria: "Recria",
  pre_postura: "Pré-postura",
  producao: "Produção",
  muda: "Muda",
  encerrado: "Encerrado",
  vazio_sanitario: "Vazio sanitário",
};
