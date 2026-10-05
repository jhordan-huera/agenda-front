import { Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditFeed } from "@/features/activity/audit-feed";
import { EMPTY_AUDIT_FILTERS, toAuditQuery } from "@/features/activity/audit-filters";
import { AuditFiltersBar } from "@/features/activity/audit-filters-bar";
import { exportAuditCsv } from "@/features/activity/export-audit";
import { useBusinessId } from "@/features/auth/use-session";
import { useAuditFeed } from "@/hooks/queries/use-activity";
import { useTeam } from "@/hooks/queries/use-team";
import { APP_NAME } from "@/lib/constants/app";
import { data, getErrorMessage } from "@/lib/data";
import { plural } from "@/lib/format";
import type { AuditEntityType } from "@/types";

const TYPES: AuditEntityType[] = [
  "appointment",
  "client",
  "service",
  "schedule",
  "blocked_time",
  "business",
  "team",
  "subscription",
  "clinical_record",
];

/** Registro de auditoría del negocio: quién hizo qué y cuándo, con lo que cambió. */
export function ActivityLog() {
  const businessId = useBusinessId();
  const team = useTeam();
  const [filters, setFilters] = useState(EMPTY_AUDIT_FILTERS);
  const query = useMemo(() => toAuditQuery(filters), [filters]);
  const feed = useAuditFeed(query);
  const [exporting, setExporting] = useState(false);

  const people = [
    ...(team.data ?? []).map((member) => ({ value: member.userId, label: `${member.firstName} ${member.lastName}` })),
    { value: "online", label: "Reservas online" },
    { value: "support", label: `Soporte de ${APP_NAME}` },
  ];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const count = await exportAuditCsv(
        (cursor) => data.auditLogs.list(businessId, { ...query, cursor, limit: 1000 }),
        `actividad-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success(count ? `Exportaste ${plural(count, "entrada", "entradas")}` : "No hay actividad con esos filtros");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad</CardTitle>
        <CardDescription>Quién hizo qué y cuándo en tu negocio, con lo que cambió. No se puede modificar.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" disabled={exporting} onClick={exportCsv}>
            {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download />} Exportar
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <AuditFiltersBar value={filters} onChange={setFilters} types={TYPES} people={people} />
        <AuditFeed feed={feed} />
      </CardContent>
    </Card>
  );
}
