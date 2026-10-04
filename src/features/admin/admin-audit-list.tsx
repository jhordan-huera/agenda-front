import { History } from "lucide-react";
import { Link } from "react-router";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDateTime } from "@/lib/format";
import type { AdminAuditLog, AuditLog } from "@/types";

/** Lista de auditoría. Con `showBusiness`, enlaza al negocio afectado (vista de plataforma). */
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
      {entries.map((entry) => {
        const businessName = "businessName" in entry ? entry.businessName : null;
        return (
          <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
            <UserAvatar name={entry.actorName} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{entry.summary}</p>
              <p className="text-xs text-muted-foreground">
                {entry.actorName} · {formatDateTime(entry.createdAt)}
                {showBusiness && businessName && entry.businessId && (
                  <>
                    {" · "}
                    <Link to={`/admin/businesses/${entry.businessId}`} className="font-medium text-foreground hover:underline">
                      {businessName}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
