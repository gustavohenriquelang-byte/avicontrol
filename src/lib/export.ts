/** Utilitários de exportação (CSV para Excel pt-BR). */

export interface Column {
  key: string;
  label: string;
}

export type Row = Record<string, string | number | null | undefined>;

/** Escapa um valor para CSV (aspas, ponto e vírgula, quebras de linha). */
function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Gera CSV com separador ";" (padrão pt-BR) e BOM UTF-8, para abrir
 * corretamente no Excel em português.
 */
export function toCsv(columns: Column[], rows: Row[]): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(";");
  const body = rows
    .map((r) => columns.map((c) => escapeCsv(r[c.key])).join(";"))
    .join("\r\n");
  return `﻿${header}\r\n${body}`;
}

/** Dispara o download de um arquivo CSV no navegador. */
export function downloadCsv(filename: string, columns: Column[], rows: Row[]): void {
  const csv = toCsv(columns, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
