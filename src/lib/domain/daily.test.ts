import { describe, it, expect } from "vitest";
import { checkClose, classificationSum, dailyMetrics, type DailyInput } from "./daily";

const base = {
  eggs_total: 1000,
  eggs_good: 900,
  eggs_dirty: 30,
  eggs_cracked: 20,
  eggs_broken: 10,
  eggs_deformed: 5,
  eggs_double_yolk: 3,
  eggs_industrial: 12,
  eggs_discarded: 20,
};

describe("fechamento diário", () => {
  it("soma das classificações", () => {
    expect(classificationSum(base)).toBe(1000);
  });

  it("fecha quando soma = total", () => {
    const c = checkClose(base);
    expect(c.difference).toBe(0);
    expect(c.balanced).toBe(true);
  });

  it("não fecha e mostra diferença", () => {
    const c = checkClose({ ...base, eggs_total: 1015 });
    expect(c.difference).toBe(15);
    expect(c.balanced).toBe(false);
  });

  it("diferença negativa quando classificou a mais", () => {
    const c = checkClose({ ...base, eggs_total: 980 });
    expect(c.difference).toBe(-20);
    expect(c.balanced).toBe(false);
  });
});

describe("métricas diárias", () => {
  const input: DailyInput = {
    ...base,
    birds_start: 1000,
    mortality: 4,
    culls: 0,
    feed_kg: 110,
  };

  it("aves vivas descontam mortalidade e descartes", () => {
    const m = dailyMetrics(input);
    expect(m.liveBirds).toBe(996);
  });

  it("taxa de postura sobre aves vivas", () => {
    const m = dailyMetrics(input);
    // 1000 / 996 * 100
    expect(m.layingRate).toBeCloseTo(100.4, 1);
  });

  it("consumo por ave e dúzias", () => {
    const m = dailyMetrics(input);
    expect(m.dozens).toBeCloseTo(83.33, 2);
    // 110 kg * 1000 / 996 aves
    expect(m.feedPerBird).toBeCloseTo(110.44, 1);
  });

  it("aproveitamento (bons + sujos)", () => {
    const m = dailyMetrics(input);
    expect(m.utilization).toBeCloseTo(93, 5); // 930/1000
  });
});
