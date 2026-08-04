"use client";

import { Download, Printer } from "lucide-react";
import { downloadCsv, type Column, type Row } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportViewProps {
  filename: string;
  columns: Column[];
  rows: Row[];
  /** Colunas alinhadas à direita (números). */
  numericKeys?: string[];
  /** Linha de totais opcional (mesmas chaves das colunas). */
  totals?: Row;
  emptyText?: string;
}

export function ReportView({
  filename,
  columns,
  rows,
  numericKeys = [],
  totals,
  emptyText = "Sem dados para o período.",
}: ReportViewProps) {
  const isNum = (k: string) => numericKeys.includes(k);

  return (
    <div className="space-y-3">
      <div className="no-print flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir / PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(filename, columns, rows)}
          disabled={rows.length === 0}
        >
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <Card className="print-area">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">{emptyText}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={isNum(c.key) ? "text-right" : ""}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={isNum(c.key) ? "text-right tabular-nums" : ""}
                    >
                      {r[c.key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {totals && (
                <TableRow className="border-t-2 border-hairline font-semibold">
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={isNum(c.key) ? "text-right tabular-nums" : ""}
                    >
                      {totals[c.key] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
