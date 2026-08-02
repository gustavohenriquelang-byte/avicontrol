/**
 * Módulo central de cálculos de domínio (item 23 da especificação).
 *
 * REGRA IMPORTANTE: nenhuma fórmula de negócio deve ser duplicada em
 * componentes. Toda a interface e os relatórios devem importar destas
 * funções puras e testadas.
 *
 * Convenções:
 * - Percentuais retornados na escala 0–100 (ex.: 92.5 = 92,5%).
 * - Divisões por zero retornam null (indicador indisponível), nunca NaN/Infinity.
 * - Ração em kg, consumo por ave em gramas, água em litros.
 */

/** Retorna null se o denominador for 0, evitando NaN/Infinity. */
function safeDiv(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

/** Uma dúzia = 12 ovos. */
export const EGGS_PER_DOZEN = 12;

/** Converte quantidade de ovos em dúzias. */
export function eggsToDozens(eggs: number): number {
  return eggs / EGGS_PER_DOZEN;
}

/**
 * Taxa de postura (%): ovos produzidos / aves vivas × 100.
 * "Aves vivas" normalmente = aves no início do dia − mortalidade/descarte do dia.
 */
export function layingRate(eggsProduced: number, liveBirds: number): number | null {
  const r = safeDiv(eggsProduced, liveBirds);
  return r === null ? null : r * 100;
}

/** Mortalidade diária (%): mortes do dia / aves no início do dia × 100. */
export function dailyMortalityRate(
  deathsToday: number,
  birdsAtStartOfDay: number
): number | null {
  const r = safeDiv(deathsToday, birdsAtStartOfDay);
  return r === null ? null : r * 100;
}

/**
 * Mortalidade acumulada (%): mortes acumuladas / aves inicialmente alojadas × 100.
 */
export function cumulativeMortalityRate(
  accumulatedDeaths: number,
  initiallyHousedBirds: number
): number | null {
  const r = safeDiv(accumulatedDeaths, initiallyHousedBirds);
  return r === null ? null : r * 100;
}

/**
 * Consumo de ração por ave (g/ave/dia): ração em kg × 1.000 / aves vivas.
 */
export function feedPerBirdGrams(feedKg: number, liveBirds: number): number | null {
  return safeDiv(feedKg * 1000, liveBirds);
}

/**
 * Conversão alimentar por dúzia (kg de ração / dúzia produzida).
 */
export function feedConversionPerDozen(
  feedKg: number,
  dozensProduced: number
): number | null {
  return safeDiv(feedKg, dozensProduced);
}

/**
 * Aproveitamento (%): ovos comerciais / total produzido × 100.
 */
export function utilizationRate(
  commercialEggs: number,
  totalEggs: number
): number | null {
  const r = safeDiv(commercialEggs, totalEggs);
  return r === null ? null : r * 100;
}

/**
 * Perdas (%): ovos não comerciais / total produzido × 100.
 */
export function lossRate(nonCommercialEggs: number, totalEggs: number): number | null {
  const r = safeDiv(nonCommercialEggs, totalEggs);
  return r === null ? null : r * 100;
}

/**
 * Custo por ovo: custos atribuídos / ovos comerciais.
 */
export function costPerEgg(
  attributedCosts: number,
  commercialEggs: number
): number | null {
  return safeDiv(attributedCosts, commercialEggs);
}

/** Custo por dúzia: custo por ovo × 12. */
export function costPerDozen(
  attributedCosts: number,
  commercialEggs: number
): number | null {
  const cpe = costPerEgg(attributedCosts, commercialEggs);
  return cpe === null ? null : cpe * EGGS_PER_DOZEN;
}

/** Margem por dúzia: preço médio da dúzia − custo por dúzia. */
export function marginPerDozen(
  averageDozenPrice: number,
  costPerDozenValue: number
): number {
  return averageDozenPrice - costPerDozenValue;
}

/** Rentabilidade do lote: receita acumulada − custos acumulados. */
export function flockProfitability(
  accumulatedRevenue: number,
  accumulatedCosts: number
): number {
  return accumulatedRevenue - accumulatedCosts;
}

/* -------------------------------------------------------------------------- */
/* Estatística de pesagem (item 17)                                           */
/* -------------------------------------------------------------------------- */

export interface WeightStats {
  count: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  /** Desvio padrão populacional. */
  stdDev: number | null;
  /** Coeficiente de variação (%). */
  cv: number | null;
  /** Uniformidade: % de aves dentro de ±10% da média. */
  uniformity: number | null;
}

/**
 * Calcula estatísticas de uma amostra de pesos individuais (em gramas).
 * Uniformidade = proporção de aves dentro de ±10% da média (item 17).
 */
export function weightSampleStats(weights: number[]): WeightStats {
  const count = weights.length;
  if (count === 0) {
    return { count: 0, mean: null, min: null, max: null, stdDev: null, cv: null, uniformity: null };
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const min = Math.min(...weights);
  const max = Math.max(...weights);

  const variance = weights.reduce((acc, w) => acc + (w - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);
  const cv = mean === 0 ? null : (stdDev / mean) * 100;

  const lower = mean * 0.9;
  const upper = mean * 1.1;
  const withinRange = weights.filter((w) => w >= lower && w <= upper).length;
  const uniformity = (withinRange / count) * 100;

  return { count, mean, min, max, stdDev, cv, uniformity };
}

/* -------------------------------------------------------------------------- */
/* Fechamento diário de ovos (item 12)                                        */
/* -------------------------------------------------------------------------- */

export interface EggClassification {
  bons: number;
  sujos: number;
  trincados: number;
  quebrados: number;
  deformados: number;
  duasGemas: number;
  industriais: number;
  descartados: number;
}

/** Soma de todas as classificações de ovos. */
export function sumClassification(c: EggClassification): number {
  return (
    c.bons +
    c.sujos +
    c.trincados +
    c.quebrados +
    c.deformados +
    c.duasGemas +
    c.industriais +
    c.descartados
  );
}

/**
 * Verifica se a soma das classificações fecha com o total de ovos produzidos.
 * Retorna a diferença (total − soma). 0 = fechado.
 */
export function classificationDifference(
  totalEggs: number,
  c: EggClassification
): number {
  return totalEggs - sumClassification(c);
}

/**
 * Ovos comerciais = bons + sujos (aproveitáveis após lavagem).
 * Ajuste conforme a política comercial da granja.
 */
export function commercialEggs(c: EggClassification): number {
  return c.bons + c.sujos;
}

/** Ovos não comerciais (perdas). */
export function nonCommercialEggs(c: EggClassification): number {
  return c.trincados + c.quebrados + c.deformados + c.descartados;
}
