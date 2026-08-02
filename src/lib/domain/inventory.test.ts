import { describe, it, expect } from "vitest";
import {
  weightedAverageCost,
  applyOutflow,
  daysOfStock,
  convertEggs,
  DEFAULT_EGG_FACTORS,
  manureToKg,
  manureSaleTotal,
} from "./inventory";

describe("custo médio ponderado", () => {
  it("primeira entrada define o custo", () => {
    const s = weightedAverageCost({ quantity: 0, avgCost: 0 }, 1000, 2.5);
    expect(s.quantity).toBe(1000);
    expect(s.avgCost).toBeCloseTo(2.5, 5);
  });

  it("mistura ponderada de duas compras", () => {
    // 1000 kg a 2,00 + 1000 kg a 3,00 => 2,50
    let s = weightedAverageCost({ quantity: 0, avgCost: 0 }, 1000, 2.0);
    s = weightedAverageCost(s, 1000, 3.0);
    expect(s.quantity).toBe(2000);
    expect(s.avgCost).toBeCloseTo(2.5, 5);
  });

  it("ponderação com quantidades diferentes", () => {
    // 100 kg a 2,00 + 300 kg a 4,00 => (200 + 1200)/400 = 3,50
    let s = weightedAverageCost({ quantity: 100, avgCost: 2.0 }, 300, 4.0);
    expect(s.avgCost).toBeCloseTo(3.5, 5);
  });
});

describe("saída de estoque", () => {
  it("baixa quantidade sem alterar custo médio", () => {
    const s = applyOutflow({ quantity: 2000, avgCost: 2.5 }, 500);
    expect(s.quantity).toBe(1500);
    expect(s.avgCost).toBe(2.5);
  });

  it("não deixa estoque negativo", () => {
    const s = applyOutflow({ quantity: 100, avgCost: 2 }, 500);
    expect(s.quantity).toBe(0);
  });
});

describe("dias de estoque", () => {
  it("calcula dias restantes", () => {
    expect(daysOfStock(3000, 100)).toBe(30);
  });
  it("consumo zero é indeterminado", () => {
    expect(daysOfStock(3000, 0)).toBeNull();
  });
});

describe("conversões de ovos", () => {
  it("converte com fatores padrão", () => {
    const c = convertEggs(360);
    expect(c.dozens).toBe(30);
    expect(c.trays).toBe(12);
    expect(c.boxes).toBe(1);
    expect(c.kg).toBeCloseTo(360 * 0.062, 5);
  });
  it("aceita fatores customizados", () => {
    const c = convertEggs(100, { ...DEFAULT_EGG_FACTORS, tray: 20 });
    expect(c.trays).toBe(5);
  });
});

describe("esterco", () => {
  it("converte unidades para kg", () => {
    expect(manureToKg(5, "tonelada")).toBe(5000);
    expect(manureToKg(10, "saco")).toBe(250);
    expect(manureToKg(2, "big_bag")).toBe(2000);
    expect(manureToKg(100, "kg")).toBe(100);
  });

  it("calcula a receita da venda", () => {
    // 12 toneladas a R$ 180,00 = R$ 2.160,00
    expect(manureSaleTotal(12, 180)).toBe(2160);
    expect(manureSaleTotal(3.5, 200)).toBe(700);
  });
});
