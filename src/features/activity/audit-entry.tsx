import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDateTime } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";
import type { AdminAuditLog, AuditLog } from "@/types";

const FAILED_ACTIONS = new Set(["session.login_failed", "session.login_blocked"]);

/**
 * Una entrada de la auditoría: qué, quién y cuándo, con los cambios desplegables. En la vista del
 * super admin, también el negocio y, en las sesiones, desde dónde (navegador e IP).
 */
export function AuditEntry({ entry, showBusiness }: { entry: AuditLog | AdminAuditLog; showBusiness?: boolean }) {
  const [open, setOpen] = useState(false);
  const extra = "ip" in entry ? entry : null;
  const changes = entry.changes ?? [];

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <UserAvatar name={entry.actorName} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", FAILED_ACTIONS.has(entry.action) && "font-medium text-destructive")}>{entry.summary}</p>
        <p className="text-xs text-muted-foreground">
          {entry.actorName} · {formatDateTime(entry.createdAt)}
          {showBusiness && extra?.businessName && entry.businessId && (
            <>
              {" · "}
              <Link to={`/admin/businesses/${entry.businessId}`} className="font-medium text-foreground hover:underline">
                {extra.businessName}
              </Link>
            </>
          )}
        </p>
        {extra?.ip && (
          <p className="text-xs text-muted-foreground">
            {describeUserAgent(extra.userAgent)} · IP {extra.ip}
          </p>
        )}
        {changes.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
              {open ? "Ocultar cambios" : `Ver cambios (${changes.length})`}
            </button>
            {open && (
              <ul className="mt-2 grid gap-1 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                {changes.map((change, index) => (
                  <li key={`${change.label}-${index}`}>
                    <span className="font-medium">{change.label}:</span>{" "}
                    {change.before === null ? (
                      <span className="text-muted-foreground">modificado</span>
                    ) : (
                      <>
                        <span className="text-muted-foreground line-through">{change.before}</span>{" "}
                        <span aria-hidden>→</span>
                        <span className="sr-only">ahora</span> <span className="font-medium">{change.after}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}
