import { Download, Loader2, MailCheck, MailX, ShieldAlert, UserRoundX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
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
import { StatGrid } from "@/features/admin/stat-cards";
import { EmailOutboxCard } from "@/features/settings/email-outbox";
import { useAdminAuditFeed, useAdminBusinesses, useAdminEmails, useAdminStats } from "@/hooks/queries/use-admin";
import { data, getErrorMessage, type AdminAuditFilters, type AdminAuditScope } from "@/lib/data";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { plural } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import type { AdminEmailFilter, AuditEntityType } from "@/types";

const SCOPES: { value: AdminAuditScope; label: string; description: string }[] = [
  { value: "admin", label: "Super admin", description: "Tus acciones en la plataforma." },
  {
    value: "security",
    label: "Seguridad",
    description: "Inicios y cierres de sesión e intentos fallidos, con navegador e IP. Sólo los ves tú.",
  },
  { value: "all", label: "Todo", description: "Toda la actividad de todos los negocios." },
];

// Sin «Historias clínicas»: sus eventos no salen en /admin (spec 025).
const TYPES: AuditEntityType[] = [
  "appointment",
  "client",
  "service",
  "schedule",
  "blocked_time",
  "business",
  "team",
  "subscription",
  "user",
  "platform",
  "session",
];

/** «Actividad → Seguridad» se abre directamente con ?ver=seguridad (los avisos del super admin, spec 013). */
const scopeFromUrl = (value: string | null): AdminAuditScope | null => (value === "seguridad" ? "security" : null);

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

/**
 * «Ver emails» de la tarjeta «Emails de hoy» del Inicio abre esta pantalla con ?emails=hoy (o =fallidos si hubo
 * fallidos) y baja hasta la lista.
 */
const emailFilterFromUrl = (value: string | null): AdminEmailFilter | null =>
  value === "hoy" ? "today" : value === "fallidos" ? "failed" : value === "todos" ? "all" : null;

export default function AdminActivityPage() {
  const [searchParams] = useSearchParams();
  const requested = scopeFromUrl(searchParams.get("ver"));
  const [scope, setScope] = useState<AdminAuditScope>(requested ?? "admin");
  // Tocar un aviso con esta pantalla ya abierta: cambia de pestaña sin recargar.
  const [seenRequest, setSeenRequest] = useState(requested);
  if (requested !== seenRequest) {
    setSeenRequest(requested);
    if (requested) setScope(requested);
  }
  const [filters, setFilters] = useState(EMPTY_AUDIT_FILTERS);
  const [businessId, setBusinessId] = useState("all");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const businesses = useAdminBusinesses();
  const requestedEmails = emailFilterFromUrl(searchParams.get("emails"));
  const [emailFilter, setEmailFilter] = useState<AdminEmailFilter>(requestedEmails ?? "all");
  const [seenEmailsRequest, setSeenEmailsRequest] = useState(requestedEmails);
  if (requestedEmails !== seenEmailsRequest) {
    setSeenEmailsRequest(requestedEmails);
    if (requestedEmails) setEmailFilter(requestedEmails);
  }
  const emails = useAdminEmails(emailFilter);
  const stats = useAdminStats();
  const health = stats.data?.health;
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

  // Al llegar desde el Inicio, baja hasta la lista de emails, una vez por pedido y cuando ya cargó lo de arriba
  // (las cifras y la actividad): si no, al llegar empujarían la lista hacia abajo.
  const scrolledFor = useRef<AdminEmailFilter | null>(null);
  const settled = emails.isSuccess && !feed.isPending && !stats.isPending;
  useEffect(() => {
    if (!requestedEmails || !settled || scrolledFor.current === requestedEmails) return;
    scrolledFor.current = requestedEmails;
    document.getElementById("emails")?.scrollIntoView({ block: "start" });
  }, [requestedEmails, settled]);
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

      {!stats.isError && (
        <StatGrid
          loading={stats.isPending}
          items={
            health
              ? [
                  { label: "Emails enviados hoy", value: health.emailsToday.sent, icon: MailCheck, hint: `${health.emailsToday.queued} en cola` },
                  {
                    label: "Emails fallidos hoy",
                    value: health.emailsToday.failed,
                    icon: MailX,
                    tone: health.emailsToday.failed > 0 ? "warning" : "default",
                    hint: health.emailsToday.failed > 0 ? "Revisa la lista de abajo" : "Ninguno",
                  },
                  {
                    label: "Intentos fallidos (24 h)",
                    value: health.security.failedLogins24h,
                    icon: UserRoundX,
                    hint: "Inicios de sesión con contraseña incorrecta",
                  },
                  {
                    label: "Cuentas en alerta",
                    value: health.security.accountsOnAlert,
                    icon: ShieldAlert,
                    tone: health.security.accountsOnAlert > 0 ? "danger" : "default",
                    hint: "10 o más intentos en la última hora",
                  },
                ]
              : []
          }
        />
      )}

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
          <AuditFeed feed={feed} showBusiness groupByDay />
        </CardContent>
      </Card>

      <EmailOutboxCard
        id="emails"
        outbox={emails}
        groupByDay
        description="Los emails de la plataforma (los 200 más recientes): altas, contraseñas, reservas y recordatorios, con su negocio y si salieron. Toca uno para ver su contenido."
        empty={EMAIL_FILTERS.find((option) => option.value === emailFilter)!.empty}
        toolbar={
          <Tabs value={emailFilter} onValueChange={(value) => setEmailFilter(value as AdminEmailFilter)}>
            <TabsList aria-label="Qué emails ver">
              {EMAIL_FILTERS.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="px-3">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
    </div>
  );
}
