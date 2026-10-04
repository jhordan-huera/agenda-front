import { History } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs } from "@/hooks/queries/use-activity";
import { formatDateTime } from "@/lib/format";
import type { AuditEntityType } from "@/types";

const FILTERS: { value: AuditEntityType | "all"; label: string }[] = [
  { value: "all", label: "Toda la actividad" },
  { value: "appointment", label: "Citas" },
  { value: "client", label: "Clientes" },
  { value: "service", label: "Servicios" },
  { value: "schedule", label: "Horarios" },
  { value: "blocked_time", label: "Bloqueos" },
  { value: "business", label: "Negocio" },
  { value: "team", label: "Equipo" },
  { value: "subscription", label: "Suscripción" },
  { value: "clinical_record", label: "Historias clínicas" },
];

/** Registro de auditoría (§31): quién hizo qué y cuándo. */
export function ActivityLog() {
  const [filter, setFilter] = useState<AuditEntityType | "all">("all");
  const logs = useAuditLogs(filter === "all" ? {} : { entityType: filter });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad</CardTitle>
        <CardDescription>Acciones importantes realizadas en tu negocio (últimas 200).</CardDescription>
        <CardAction>
          <Select value={filter} onValueChange={(value) => setFilter(value as AuditEntityType | "all")}>
            <SelectTrigger size="sm" className="w-44" aria-label="Filtrar actividad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              {FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {logs.isPending ? (
          <Skeleton className="h-60" />
        ) : logs.isError ? (
          <ErrorState onRetry={() => logs.refetch()} />
        ) : logs.data.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
            <History className="size-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">Sin actividad registrada</p>
          </div>
        ) : (
          <ol className="max-h-[32rem] divide-y overflow-y-auto rounded-lg border">
            {logs.data.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <UserAvatar name={entry.actorName} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{entry.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorName} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
