import type { UseQueryResult } from "@tanstack/react-query";
import { Ban, Check, CircleAlert, Clock, Inbox, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupItemsByDay } from "@/features/activity/day-groups";
import { EmailPreviewDialog } from "@/features/settings/email-outbox";
import { EMAIL_TYPE_LABELS } from "@/features/settings/email-type-labels";
import { formatClockTime, formatDate, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminEmailFilter, EmailNotification } from "@/types";
import { emailStatusOf, type EmailStatusKey } from "./email-status";

/** Los filtros de los emails, con su texto cuando no hay ninguno. */
const EMAIL_FILTERS: { value: AdminEmailFilter; label: string; empty: { title: string; detail: string } }[] = [
  {
    value: "today",
    label: "Hoy",
    empty: { title: "Hoy todavía no salió ningún email", detail: "Ni hay emails en cola: los de «Emails de hoy» del Inicio salen aquí." },
  },
  {
    value: "failed",
    label: "Fallidos",
    empty: { title: "No hay emails fallidos", detail: "Los que Gmail no pudo entregar salen aquí, con el motivo." },
  },
  { value: "all", label: "Todos", empty: { title: "Todavía no se ha enviado ningún email", detail: "Los emails de la plataforma salen aquí." } },
];

const STATUS_ICONS: Record<EmailStatusKey, LucideIcon> = { sent: Check, queued: Clock, failed: CircleAlert, discarded: Ban };

/** Las columnas de la tabla en el computador: Hora, Estado, Email, Negocio y Tipo. */
const COLUMNS = "md:grid-cols-[3.25rem_6.75rem_minmax(0,1fr)_11rem_10rem]";

/**
 * Los emails de la plataforma en /admin → Actividad (spec 049), con el estado primero: sólo el que falló va en
 * rojo, con el motivo. En el computador, una tabla por día; en el celular, cada email en varias líneas sin
 * cortar el asunto. Al tocar uno se abre su contenido.
 */
export function AdminEmailList({
  outbox,
  filter,
  onFilterChange,
}: {
  outbox: UseQueryResult<EmailNotification[]>;
  filter: AdminEmailFilter;
  onFilterChange: (filter: AdminEmailFilter) => void;
}) {
  const [preview, setPreview] = useState<EmailNotification | null>(null);
  const empty = EMAIL_FILTERS.find((option) => option.value === filter)!.empty;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Tabs value={filter} onValueChange={(value) => onFilterChange(value as AdminEmailFilter)}>
          <TabsList aria-label="Qué emails ver">
            {EMAIL_FILTERS.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="px-3">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">Los 200 más recientes. Toca uno para ver lo que decía.</p>
      </div>

      {outbox.isPending ? (
        <Skeleton className="h-60 rounded-xl" />
      ) : outbox.isError ? (
        <ErrorState onRetry={() => outbox.refetch()} />
      ) : outbox.data.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-10 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium">{empty.title}</p>
          <p className="text-xs text-muted-foreground">{empty.detail}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div aria-hidden className={cn("hidden gap-x-4 border-b px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid", COLUMNS)}>
            <span>Hora</span>
            <span>Estado</span>
            <span>Email</span>
            <span>Negocio</span>
            <span>Tipo</span>
          </div>
          {groupItemsByDay(outbox.data, (email) => email.createdAt).map((group, index) => (
            <section key={group.date} aria-label={group.label}>
              <h3
                className={cn(
                  "flex items-baseline justify-between gap-3 border-b bg-muted/60 px-4 py-2 text-[0.8125rem] font-semibold md:px-5",
                  index > 0 && "border-t",
                )}
              >
                {group.label === "Hoy" || group.label === "Ayer" ? `${group.label}, ${formatDate(group.date, "EEEE d 'de' MMMM")}` : group.label}
                <span className="text-xs font-normal text-muted-foreground">{plural(group.items.length, "email", "emails")}</span>
              </h3>
              <ul className="divide-y">
                {group.items.map((email) => (
                  <li key={email.id}>
                    <EmailRow email={email} onOpen={() => setPreview(email)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <EmailPreviewDialog email={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function EmailRow({ email, onOpen }: { email: EmailNotification; onOpen: () => void }) {
  const status = emailStatusOf(email);
  const failed = status.key === "failed";
  const Icon = STATUS_ICONS[status.key];
  const time = formatClockTime(email.createdAt);
  const type = EMAIL_TYPE_LABELS[email.type];
  const business = email.businessName ?? "Sin negocio";
  const detail = status.detail && (
    <span className={cn("mt-1 block text-xs [overflow-wrap:anywhere]", failed ? "text-destructive" : "text-muted-foreground")}>{status.detail}</span>
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "grid w-full grid-cols-[1.125rem_minmax(0,1fr)] items-start gap-x-3 px-4 py-3 text-left outline-none md:gap-x-4 md:px-5",
        COLUMNS,
        failed ? "bg-destructive/[0.06] hover:bg-destructive/10 focus-visible:bg-destructive/10" : "hover:bg-muted/60 focus-visible:bg-muted/60",
      )}
    >
      {/* En el celular: el icono del estado y el email en varias líneas. */}
      <Icon className={cn("mt-0.5 size-[18px] md:hidden", failed ? "text-destructive" : "text-muted-foreground")} aria-hidden />
      <span className="min-w-0 md:hidden">
        <span className="block text-sm leading-snug font-medium [overflow-wrap:anywhere]">{email.subject}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          <span className={cn("font-semibold", failed ? "text-destructive" : status.key === "queued" && "text-foreground")}>{status.label}</span> · {time} · {type}
        </span>
        <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Para {email.to} · {business}
        </span>
        {detail}
      </span>

      {/* En el computador: Hora, Estado, Email, Negocio y Tipo. */}
      <span className="hidden pt-px text-[0.8125rem] text-muted-foreground tabular-nums md:block">{time}</span>
      <span
        className={cn(
          "hidden items-center gap-1.5 text-[0.8125rem] md:flex",
          failed ? "font-semibold text-destructive" : status.key === "queued" ? "font-medium" : "text-muted-foreground",
        )}
      >
        <Icon className={cn("size-[15px] shrink-0", !failed && "text-muted-foreground")} aria-hidden />
        {status.label}
      </span>
      <span className="hidden min-w-0 md:block">
        <span className="block text-sm font-medium [overflow-wrap:anywhere]">{email.subject}</span>
        <span className="block text-xs text-muted-foreground [overflow-wrap:anywhere]">Para {email.to}</span>
        {detail}
      </span>
      <span className={cn("hidden truncate text-[0.8125rem] md:block", !email.businessName && "text-muted-foreground")} title={business}>
        {business}
      </span>
      <span className="hidden text-[0.8125rem] text-muted-foreground md:block">{type}</span>
    </button>
  );
}
