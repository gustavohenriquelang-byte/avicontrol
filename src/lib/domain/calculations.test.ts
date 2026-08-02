import { describe, it, expect } from "vitest";
import {
  layingRate,
  dailyMortalityRate,
  cumulativeMortalityRate,
  feedPerBirdGrams,
  feedConversionPerDozen,
  utilizationRate,
  lossRate,
  costPerEgg,
  costPerDozen,
  marginPerDozen,
  flockProfitability,
  weightSampleStats,
  classificationDifference,
  sumClassification,
  commercialEggs,
  nonCommercialEggs,
  eggsToDozens,
  type EggClassification,
} from "./calculations";

describe("indicadores de produção", () => {
  it("taxa de postura", () => {
    expect(layingRate(920, 1000)).toBe(92);
    expect(layingRate(10, 0)).toBeNull();
  });

  it("mortalidade diária e acumulada", () => {
    expect(dailyMortalityRate(5, 1000)).toBeCloseTo(0.5, 5);
    expect(cumulativeMortalityRate(120, 10000)).toBeCloseTo(1.2, 5);
    expect(dailyMortalityRate(1, 0)).toBeNull();
  });

  it("consumo de ração por ave em gramas", () => {
    // 110 kg / 1000 aves = 110 g/ave
    expect(feedPerBirdGrams(110, 1000)).toBe(110);
    expect(feedPerBirdGrams(1, 0)).toBeNull();
  });

  it("conversão alimentar por dúzia", () => {
    // 100 kg / 50 dúzias = 2 kg/dúzia
    expect(feedConversionPerDozen(100, 50)).toBe(2);
    expect(feedConversionPerDozen(1, 0)).toBeNull();
  });

  it("aproveitamento e perdas somam 100%", () => {
    const total = 1000;
    const commercial = 950;
    const util = utilizationRate(commercial, total)!;
    const loss = lossRate(total - commercial, total)!;
    expect(util).toBeCloseTo(95, 5);
    expect(loss).toBeCloseTo(5, 5);
    expect(util + loss).toBeCloseTo(100, 5);
  });
});

describe("custos e rentabilidade", () => {
  it("custo por ovo e por dúzia", () => {
    expect(costPerEgg(100, 1000)).toBe(0.1);
    expect(costPerDozen(100, 1000)).toBeCloseTo(1.2, 5);
    expect(costPerEgg(100, 0)).toBeNull();
  });

  it("margem por dúzia e rentabilidade do lote", () => {
    expect(marginPerDozen(4.5, 1.2)).toBeCloseTo(3.3, 5);
    expect(flockProfitability(50000, 38000)).toBe(12000);
    expect(flockProfitability(30000, 40000)).toBe(-10000);
  });

  it("eggsToDozens", () => {
    expect(eggsToDozens(24)).toBe(2);
  });
});

describe("estatística de pesagem", () => {
  it("média, min, max, desvio e uniformidade", () => {
    const stats = weightSampleStats([100, 100, 100, 100]);
    expect(stats.mean).toBe(100);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(100);
    expect(stats.stdDev).toBe(0);
    expect(stats.cv).toBe(0);
    expect(stats.uniformity).toBe(100);
  });

  it("uniformidade dentro de ±10% da média", () => {
    // média = 100; faixa 90–110. 3 dentro, 1 fora (80) => 75%
    const stats = weightSampleStats([100, 105, 95, 80]);
    expect(stats.mean).toBe(95);
    // recalcular faixa com média 95: 85.5–104.5 => 100,105(fora),95,80(fora) => 50%
    expect(stats.uniformity).toBe(50);
  });

  it("amostra vazia retorna nulos", () => {
    const stats = weightSampleStats([]);
    expect(stats.count).toBe(0);
    expect(stats.mean).toBeNull();
    expect(stats.uniformity).toBeNull();
  });
});

describe("fechamento diário de ovos", () => {
  const c: EggClassification = {
    bons: 900,
    sujos: 30,
    trincados: 20,
    quebrados: 10,
    deformados: 5,
    duasGemas: 3,
    industriais: 12,
    descartados: 20,
  };

  it("soma das classificações", () => {
    expect(sumClassification(c)).toBe(1000);
  });

  it("diferença zero quando fecha", () => {
    expect(classificationDifference(1000, c)).toBe(0);
  });

  it("diferença positiva quando falta classificar", () => {
    expect(classificationDifference(1010, c)).toBe(10);
  });

  it("comerciais e não comerciais", () => {
    expect(commercialEggs(c)).toBe(930);
    expect(nonCommercialEggs(c)).toBe(55);
  });
});
