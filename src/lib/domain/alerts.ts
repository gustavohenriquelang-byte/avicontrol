/**
 * Motor de regras de alertas (item 24). Função pura e testável: recebe um
 * retrato dos dados e devolve a lista de alertas com nível.
 */

export type AlertLevel = "informativo" | "atencao" | "critico";

export interface ComputedAlert {
  type: string;
  level: AlertLevel;
  title: string;
  message: string;
}

export interface AlertInput {
  /** Lotes em produção sem lançamento fechado hoje. */
  pendingLaunchFlocks: string[];
  /** Taxa de mortalidade do último dia (%). */
  lastDayMortalityRate: number | null;
  /** Dias restantes de estoque de ração. */
  feedDaysOfStock: number | null;
  /** Agendas de vacinação atrasadas. */
  overdueSchedules: { flock: string; vaccine: string; date: string }[];
  /** Agendas de vacinação nos próximos dias. */
  upcomingSchedules: { flock: string; vaccine: string; date: string }[];
  /** Tarefas atrasadas. */
  overdueTasks: { title: string; date: string }[];
}

/** Limiares configuráveis (poderão vir de settings no futuro). */
export const ALERT_THRESHOLDS = {
  mortalityWarnPct: 0.3,
  mortalityCritPct: 0.7,
  feedDaysWarn: 7,
  feedDaysCrit: 3,
};

export function computeAlerts(input: AlertInput): ComputedAlert[] {
  const alerts: ComputedAlert[] = [];

  if (input.pendingLaunchFlocks.length > 0) {
    alerts.push({
      type: "lancamento_pendente",
      level: "atencao",
      title: "Lançamento diário pendente",
      message: `${input.pendingLaunchFlocks.length} lote(s) sem lançamento fechado hoje: ${input.pendingLaunchFlocks.join(", ")}.`,
    });
  }

  if (input.lastDayMortalityRate != null) {
    if (input.lastDayMortalityRate >= ALERT_THRESHOLDS.mortalityCritPct) {
      alerts.push({
        type: "mortalidade_alta",
        level: "critico",
        title: "Mortalidade elevada",
        message: `Mortalidade do último dia em ${input.lastDayMortalityRate.toFixed(2)}% (acima do limite crítico).`,
      });
    } else if (input.lastDayMortalityRate >= ALERT_THRESHOLDS.mortalityWarnPct) {
      alerts.push({
        type: "mortalidade_atencao",
        level: "atencao",
        title: "Mortalidade em atenção",
        message: `Mortalidade do último dia em ${input.lastDayMortalityRate.toFixed(2)}%.`,
      });
    }
  }

  if (input.feedDaysOfStock != null) {
    if (input.feedDaysOfStock <= ALERT_THRESHOLDS.feedDaysCrit) {
      alerts.push({
        type: "racao_baixa",
        level: "critico",
        title: "Estoque de ração crítico",
        message: `Restam cerca de ${Math.floor(input.feedDaysOfStock)} dia(s) de ração.`,
      });
    } else if (input.feedDaysOfStock <= ALERT_THRESHOLDS.feedDaysWarn) {
      alerts.push({
        type: "racao_atencao",
        level: "atencao",
        title: "Estoque de ração baixo",
        message: `Restam cerca de ${Math.floor(input.feedDaysOfStock)} dia(s) de ração.`,
      });
    }
  }

  for (const s of input.overdueSchedules) {
    alerts.push({
      type: "vacina_atrasada",
      level: "critico",
      title: "Vacinação atrasada",
      message: `${s.vaccine} do lote ${s.flock} estava agendada para ${s.date}.`,
    });
  }

  for (const s of input.upcomingSchedules) {
    alerts.push({
      type: "vacina_proxima",
      level: "informativo",
      title: "Vacinação próxima",
      message: `${s.vaccine} do lote ${s.flock} agendada para ${s.date}.`,
    });
  }

  for (const t of input.overdueTasks) {
    alerts.push({
      type: "tarefa_atrasada",
      level: "atencao",
      title: "Tarefa atrasada",
      message: `"${t.title}" venceu em ${t.date}.`,
    });
  }

  // Ordena por severidade (crítico → informativo).
  const order: Record<AlertLevel, number> = { critico: 0, atencao: 1, informativo: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}
