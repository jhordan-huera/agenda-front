import { History } from "lucide-react";
import { AuditEntry } from "@/features/activity/audit-entry";
import type { AdminAuditLog, AuditLog } from "@/types";

/** Lista corta de auditoría (p. ej. la actividad reciente en la ficha de un negocio). */
export function AdminAuditList({ entries, showBusiness }: { entries: (AuditLog | AdminAuditLog)[]; showBusiness?: boolean }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
        <History className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">Sin actividad registrada</p>
      </div>
    );
  }
  return (
    <ol className="max-h-[36rem] divide-y overflow-y-auto rounded-lg border">
      {entries.map((entry) => (
        <AuditEntry key={entry.id} entry={entry} showBusiness={showBusiness} />
      ))}
    </ol>
  );
}
