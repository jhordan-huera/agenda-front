import { downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import type { AdminAuditLog, AuditLog, AuditLogPage } from "@/types";
import { AUDIT_TYPE_LABELS, describeChange } from "./audit-filters";

/** Máximo de filas por exportación (10 páginas de 1000). */
const MAX_ROWS = 10_000;

/**
 * Descarga la auditoría filtrada como CSV para Excel (separador ";" y BOM UTF-8, como lo espera
 * Excel en español: ver lib/csv.ts). Las fechas, en `timezone` (la del negocio; sin ella, la de la
 * plataforma). Devuelve cuántas filas exportó.
 */
export async function exportAuditCsv<T extends AuditLog>(
  fetchPage: (cursor: string | undefined) => Promise<AuditLogPage<T>>,
  fileName: string,
  timezone?: string,
): Promise<number> {
  const rows: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    rows.push(...page.entries);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && rows.length < MAX_ROWS);

  const admin = rows.some((row) => "ip" in row);
  const header = ["Fecha", "Autor", "Acción", "Tipo", "Cambios", ...(admin ? ["Negocio", "IP", "Navegador"] : [])];
  const lines = rows.slice(0, MAX_ROWS).map((row) => {
    const extra = row as Partial<AdminAuditLog>;
    return [
      formatDateTime(row.createdAt, timezone),
      row.actorName,
      row.summary,
      AUDIT_TYPE_LABELS[row.entityType] ?? row.entityType,
      (row.changes ?? []).map(describeChange).join("; "),
      ...(admin ? [extra.businessName ?? "", extra.ip ?? "", describeUserAgent(extra.userAgent ?? null) ?? ""] : []),
    ];
  });
  downloadCsv([header, ...lines], fileName);
  return Math.min(rows.length, MAX_ROWS);
}
