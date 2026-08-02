/**
 * Cálculos de estoque (item 15) — ração e ovos.
 * Custo médio ponderado e fatores de conversão configuráveis.
 */

export interface StockState {
  quantity: number; // kg em estoque
  avgCost: number; // R$/kg
}

/**
 * Custo médio ponderado após uma entrada (compra).
 * novoCusto = (qtdAtual·custoAtual + qtdEntrada·custoEntrada) / (qtdAtual + qtdEntrada)
 */
export function weightedAverageCost(
  current: StockState,
  incomingQty: number,
  incomingUnitCost: number
): StockState {
  const totalQty = current.quantity + incomingQty;
  if (totalQty <= 0) return { quantity: 0, avgCost: 0 };
  const totalValue = current.quantity * current.avgCost + incomingQty * incomingUnitCost;
  return {
    quantity: totalQty,
    avgCost: totalValue / totalQty,
  };
}

/** Baixa de estoque (consumo/saída). O custo médio não muda em saídas. */
export function applyOutflow(current: StockState, qty: number): StockState {
  return {
    quantity: Math.max(0, current.quantity - qty),
    avgCost: current.avgCost,
  };
}

/**
 * Dias restantes de estoque, dado o consumo médio diário (kg/dia).
 * Retorna null quando o consumo é zero (indeterminado).
 */
export function daysOfStock(quantityKg: number, dailyConsumptionKg: number): number | null {
  if (dailyConsumptionKg <= 0) return null;
  return quantityKg / dailyConsumptionKg;
}

/* -------------------------------------------------------------------------- */
/* Conversões de ovos (item 13) — fatores configuráveis                       */
/* -------------------------------------------------------------------------- */

export interface EggConversionFactors {
  /** ovos por dúzia (padrão 12). */
  dozen: number;
  /** ovos por bandeja (padrão 30). */
  tray: number;
  /** ovos por caixa (padrão 360 = 12 bandejas). */
  box: number;
  /** peso médio do ovo em kg (padrão 0.062 kg). */
  eggWeightKg: number;
}

export const DEFAULT_EGG_FACTORS: EggConversionFactors = {
  dozen: 12,
  tray: 30,
  box: 360,
  eggWeightKg: 0.062,
};

export interface EggConversions {
  units: number;
  dozens: number;
  trays: number;
  boxes: number;
  kg: number;
}

/** Converte uma quantidade de ovos (unidades) para as demais unidades. */
export function convertEggs(
  units: number,
  factors: EggConversionFactors = DEFAULT_EGG_FACTORS
): EggConversions {
  return {
    units,
    dozens: units / factors.dozen,
    trays: units / factors.tray,
    boxes: units / factors.box,
    kg: units * factors.eggWeightKg,
  };
}

/* -------------------------------------------------------------------------- */
/* Esterco / cama de aviário                                                  */
/* -------------------------------------------------------------------------- */

export type ManureUnit = "kg" | "tonelada" | "saco" | "big_bag" | "m3";

/**
 * Fatores de conversão para kg (valores padrão, configuráveis no futuro).
 * saco e m3 variam conforme densidade/embalagem; usados como estimativa.
 */
export const MANURE_KG_FACTORS: Record<ManureUnit, number> = {
  kg: 1,
  tonelada: 1000,
  saco: 25, // saco padrão de 25 kg
  big_bag: 1000, // big bag de 1 tonelada
  m3: 600, // densidade estimada ~600 kg/m³
};

export const MANURE_UNIT_LABELS: Record<ManureUnit, string> = {
  kg: "kg",
  tonelada: "tonelada",
  saco: "saco (25 kg)",
  big_bag: "big bag (1 t)",
  m3: "m³",
};

/** Converte uma quantidade de esterco na unidade informada para kg. */
export function manureToKg(quantity: number, unit: ManureUnit): number {
  return quantity * (MANURE_KG_FACTORS[unit] ?? 1);
}

/** Receita de uma venda de esterco: quantidade × preço unitário. */
export function manureSaleTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}
