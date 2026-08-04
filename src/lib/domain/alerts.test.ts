import { describe, it, expect } from "vitest";
import { computeAlerts, type AlertInput } from "./alerts";

const empty: AlertInput = {
  pendingLaunchFlocks: [],
  lastDayMortalityRate: null,
  feedDaysOfStock: null,
  overdueSchedules: [],
  upcomingSchedules: [],
  overdueTasks: [],
};

describe("motor de alertas", () => {
  it("sem problemas não gera alertas", () => {
    expect(computeAlerts(empty)).toHaveLength(0);
  });

  it("lançamento pendente gera atenção", () => {
    const a = computeAlerts({ ...empty, pendingLaunchFlocks: ["L01", "L02"] });
    expect(a).toHaveLength(1);
    expect(a[0].level).toBe("atencao");
    expect(a[0].type).toBe("lancamento_pendente");
  });

  it("mortalidade crítica e de atenção", () => {
    expect(computeAlerts({ ...empty, lastDayMortalityRate: 0.9 })[0].level).toBe("critico");
    expect(computeAlerts({ ...empty, lastDayMortalityRate: 0.4 })[0].level).toBe("atencao");
    expect(computeAlerts({ ...empty, lastDayMortalityRate: 0.1 })).toHaveLength(0);
  });

  it("estoque de ração baixo e crítico", () => {
    expect(computeAlerts({ ...empty, feedDaysOfStock: 2 })[0].level).toBe("critico");
    expect(computeAlerts({ ...empty, feedDaysOfStock: 5 })[0].level).toBe("atencao");
    expect(computeAlerts({ ...empty, feedDaysOfStock: 20 })).toHaveLength(0);
  });

  it("vacina atrasada é crítica; próxima é informativa", () => {
    const a = computeAlerts({
      ...empty,
      overdueSchedules: [{ flock: "L01", vaccine: "Newcastle", date: "20/07/2026" }],
      upcomingSchedules: [{ flock: "L02", vaccine: "Bouba", date: "05/08/2026" }],
    });
    expect(a[0].level).toBe("critico");
    expect(a[a.length - 1].level).toBe("informativo");
  });

  it("ordena por severidade", () => {
    const a = computeAlerts({
      ...empty,
      pendingLaunchFlocks: ["L01"],
      feedDaysOfStock: 2,
      upcomingSchedules: [{ flock: "L02", vaccine: "Bouba", date: "05/08/2026" }],
    });
    expect(a[0].level).toBe("critico");
    expect(a[a.length - 1].level).toBe("informativo");
  });
});
