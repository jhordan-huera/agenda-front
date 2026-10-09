import { Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditFeed } from "@/features/activity/audit-feed";
import { EMPTY_AUDIT_FILTERS, toAuditQuery } from "@/features/activity/audit-filters";
import { AuditFiltersBar } from "@/features/activity/audit-filters-bar";
import { exportAuditCsv } from "@/features/activity/export-audit";
import { EmailOutboxCard } from "@/features/settings/email-outbox";
import { useAdminAuditFeed, useAdminBusinesses, useAdminEmails } from "@/hooks/queries/use-admin";
import { data, getErrorMessage, type AdminAuditFilters, type AdminAuditScope } from "@/lib/data";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { plural } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import type { AuditEntityType } from "@/types";

const SCOPES: { value: AdminAuditScope; label: string; description: string }[] = [
  { value: "admin", label: "Super admin", description: "Tus acciones en la plataforma." },
  {
    value: "security",
    label: "Seguridad",
    description: "Inicios y cierres de sesión e intentos fallidos, con navegador e IP. Sólo los ves tú.",
  },
  { value: "all", label: "Todo", description: "Toda la actividad de todos los negocios." },
];

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
  "user",
  "platform",
  "session",
];

export default function AdminActivityPage() {
  const [scope, setScope] = useState<AdminAuditScope>("admin");
  const [filters, setFilters] = useState(EMPTY_AUDIT_FILTERS);
  const [businessId, setBusinessId] = useState("all");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const businesses = useAdminBusinesses();
  const emails = useAdminEmails();
  const [exporting, setExporting] = useState(false);

  const query = useMemo<Omit<AdminAuditFilters, "cursor">>(
    () => ({
      ...toAuditQuery(filters),
      ...(scope === "security" ? { entityType: undefined } : {}),
      scope,
      businessId: businessId === "all" ? undefined : businessId,
      action: scope === "security" && onlyFailed ? "session.login_failed" : undefined,
    }),
    [filters, scope, businessId, onlyFailed],
  );
  const feed = useAdminAuditFeed(query);
  const current = SCOPES.find((option) => option.value === scope)!;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const count = await exportAuditCsv(
        (cursor) => data.admin.listAuditLogs({ ...query, cursor, limit: 1000 }),
        `auditoria-${scope}-${getZonedNow(DEFAULT_TIMEZONE).date}.csv`,
      );
      toast.success(count ? `Exportaste ${plural(count, "entrada", "entradas")}` : "No hay actividad con esos filtros");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Actividad de la plataforma" />
      <PageHeader title="Actividad" description="Auditoría de la plataforma y emails enviados por el sistema." />

      <Card>
        <CardHeader>
          <CardTitle>Auditoría</CardTitle>
          <CardDescription>{current.description}</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" disabled={exporting} onClick={exportCsv}>
              {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download />} Exportar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Tabs value={scope} onValueChange={(value) => setScope(value as AdminAuditScope)}>
            <TabsList>
              {SCOPES.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="px-3">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <AuditFiltersBar value={filters} onChange={setFilters} types={scope === "security" ? undefined : TYPES}>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger aria-label="Negocio" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Todos los negocios</SelectItem>
                {(businesses.data ?? []).map(({ business }) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {scope === "security" && (
              <label className="flex h-9 items-center gap-2 text-sm">
                <Switch checked={onlyFailed} onCheckedChange={setOnlyFailed} /> Sólo intentos fallidos
              </label>
            )}
          </AuditFiltersBar>
          <AuditFeed feed={feed} showBusiness />
        </CardContent>
      </Card>

      <EmailOutboxCard
        outbox={emails}
        description="Todos los emails de la plataforma: altas, contraseñas, reservas y recordatorios."
      />
    </div>
  );
}
