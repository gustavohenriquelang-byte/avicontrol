/**
 * Regras do lançamento diário (item 12) — derivadas do módulo central de
 * cálculos. Trabalha com os nomes de campo da tabela daily_records.
 */
import {
  layingRate,
  feedPerBirdGrams,
  feedConversionPerDozen,
  utilizationRate,
  eggsToDozens,
  type EggClassification,
} from "./calculations";

export interface DailyCounts {
  eggs_total: number;
  eggs_good: number;
  eggs_dirty: number;
  eggs_cracked: number;
  eggs_broken: number;
  eggs_deformed: number;
  eggs_double_yolk: number;
  eggs_industrial: number;
  eggs_discarded: number;
}

/** Converte os campos do lançamento para a classificação padrão. */
export function toClassification(d: DailyCounts): EggClassification {
  return {
    bons: d.eggs_good,
    sujos: d.eggs_dirty,
    trincados: d.eggs_cracked,
    quebrados: d.eggs_broken,
    deformados: d.eggs_deformed,
    duasGemas: d.eggs_double_yolk,
    industriais: d.eggs_industrial,
    descartados: d.eggs_discarded,
  };
}

/** Soma das classificações informadas. */
export function classificationSum(d: DailyCounts): number {
  return (
    d.eggs_good +
    d.eggs_dirty +
    d.eggs_cracked +
    d.eggs_broken +
    d.eggs_deformed +
    d.eggs_double_yolk +
    d.eggs_industrial +
    d.eggs_discarded
  );
}

export interface CloseCheck {
  sum: number;
  /** total informado − soma das classificações (0 = fecha). */
  difference: number;
  balanced: boolean;
}

/**
 * Verifica o fechamento das classificações contra o total (item 12).
 * A soma deve fechar com o total; caso contrário, mostra a diferença.
 */
export function checkClose(d: DailyCounts): CloseCheck {
  const sum = classificationSum(d);
  const difference = d.eggs_total - sum;
  return { sum, difference, balanced: difference === 0 };
}

export interface DailyInput extends DailyCounts {
  birds_start: number;
  mortality: number;
  culls: number;
  feed_kg: number;
}

export interface DailyMetrics {
  /** Aves vivas ao fim do dia (início − mortalidade − descartes). */
  liveBirds: number;
  dozens: number;
  layingRate: number | null;
  feedPerBird: number | null;
  feedConversionPerDozen: number | null;
  utilization: number | null;
}

/** Indicadores derivados de um lançamento diário. */
export function dailyMetrics(d: DailyInput): DailyMetrics {
  const liveBirds = Math.max(0, d.birds_start - d.mortality - d.culls);
  const dozens = eggsToDozens(d.eggs_total);
  const commercial = d.eggs_good + d.eggs_dirty;
  return {
    liveBirds,
    dozens,
    layingRate: layingRate(d.eggs_total, liveBirds),
    feedPerBird: feedPerBirdGrams(d.feed_kg, liveBirds),
    feedConversionPerDozen: feedConversionPerDozen(d.feed_kg, dozens),
    utilization: utilizationRate(commercial, d.eggs_total),
  };
}
