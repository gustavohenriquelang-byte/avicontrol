/**
 * Formatadores padronizados para a interface (pt-BR).
 * Moeda: R$ 1.234,56 | Datas: DD/MM/AAAA | Percentuais com 2 casas.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DEC2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** R$ 1.234,56 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return BRL.format(value);
}

/** 1.234 (sem casas decimais) */
export function formatInt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return INT.format(value);
}

/** 12,34 (duas casas) */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return DEC2.format(value);
}

/** 12,34% (percentual com duas casas decimais) */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${DEC2.format(value)}%`;
}

/** DD/MM/AAAA a partir de Date ou string ISO. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";

  // Datas "puras" (YYYY-MM-DD, sem hora) não devem sofrer conversão de fuso,
  // senão um dia pode ser deslocado. Formata direto os componentes.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split("-");
    return `${day}/${m}/${y}`;
  }

  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** DD/MM/AAAA HH:mm */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

/** Formato ISO YYYY-MM-DD (para inputs date e chaves). */
export function toISODate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

/** Data de hoje (YYYY-MM-DD) no fuso America/Sao_Paulo. */
export function todayISOSaoPaulo(): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Soma (ou subtrai) dias de uma data YYYY-MM-DD, retornando YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
