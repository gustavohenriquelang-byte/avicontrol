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

export const weighingSchema = z.object({
  flock_id: z.string().uuid("Selecione o lote"),
  weigh_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  age_days: optionalNumber,
  weights: z.string().min(1, "Informe os pesos"),
  notes: optionalText,
});
export type WeighingInput = z.infer<typeof weighingSchema>;

/** Converte texto livre (vírgula/espaço/linha) em lista de pesos numéricos. */
export function parseWeights(raw: string): number[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => Number(s.replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export const environmentSchema = z.object({
  house_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  farm_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  temp_min: optionalNumber,
  temp_max: optionalNumber,
  temp_current: optionalNumber,
  humidity: optionalNumber,
  ammonia: optionalNumber,
  co2: optionalNumber,
  luminosity: optionalNumber,
  light_hours: optionalNumber,
  ventilation: optionalText,
  notes: optionalText,
});
export type EnvironmentInput = z.infer<typeof environmentSchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe o título"),
  description: optionalText,
  farm_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  flock_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  assigned_to: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  priority: z.enum(["baixa", "media", "alta"]),
  due_date: optionalText,
  status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]),
});
export type TaskInput = z.infer<typeof taskSchema>;

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const vaccineSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  manufacturer: optionalText,
  target_disease: optionalText,
  route: optionalText,
  doses: optionalNumber,
  withdrawal_days: optionalNumber,
  active: z.coerce.boolean().default(true),
});
export type VaccineInput = z.infer<typeof vaccineSchema>;

export const medicationSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  manufacturer: optionalText,
  kind: optionalText,
  withdrawal_days: optionalNumber,
  active: z.coerce.boolean().default(true),
});
export type MedicationInput = z.infer<typeof medicationSchema>;

export const healthEventSchema = z.object({
  event_type: z.enum(["vacinacao", "medicacao", "ocorrencia", "tratamento"]),
  flock_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  vaccine_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  medication_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  description: optionalText,
  dose: optionalText,
  responsible: optionalText,
  notes: optionalText,
});
export type HealthEventInput = z.infer<typeof healthEventSchema>;

export const scheduleSchema = z.object({
  flock_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  vaccine_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: optionalText,
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

export const HEALTH_EVENT_LABELS: Record<string, string> = {
  vacinacao: "Vacinação",
  medicacao: "Medicação",
  ocorrencia: "Ocorrência",
  tratamento: "Tratamento",
};

export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  programada: "Programada",
  proxima: "Próxima",
  atrasada: "Atrasada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  doc: optionalText,
  phone: optionalText,
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("").transform(() => undefined)),
  address: optionalText,
  city: optionalText,
  state: optionalText,
  credit_limit: optionalNumber,
  notes: optionalText,
  active: z.coerce.boolean().default(true),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório"),
  unit: z.string().trim().min(1).default("duzia"),
  classification: optionalText,
  price: optionalNumber,
  active: z.coerce.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

export const financialEntrySchema = z.object({
  entry_type: z.enum(["receita", "despesa"]),
  category_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().min(2, "Descrição é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  due_date: optionalText,
  status: z.enum(["pendente", "pago"]),
  cost_center: optionalText,
  farm_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  payment_method: optionalText,
});
export type FinancialEntryInput = z.infer<typeof financialEntrySchema>;

export const SALES_ORDER_STATUS_LABELS: Record<string, string> = {
  orcamento: "Orçamento",
  pedido: "Pedido",
  separado: "Separado",
  faturado: "Faturado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/** Categorias iniciais sugeridas (item 21). */
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Ração", "Aves", "Medicamentos", "Vacinas", "Mão de obra", "Energia",
  "Água", "Embalagens", "Transporte", "Manutenção", "Combustível",
  "Impostos", "Serviços", "Outras",
];
export const DEFAULT_REVENUE_CATEGORIES = ["Ovos", "Esterco", "Aves descarte", "Outras"];

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
