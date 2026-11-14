import { Download, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EMPTY_AUDIT_FILTERS, toAuditQuery } from "@/features/activity/audit-filters";
import { AuditFiltersBar } from "@/features/activity/audit-filters-bar";
import { exportAuditCsv } from "@/features/activity/export-audit";
import { ActivityLedger } from "@/features/admin/activity/activity-ledger";
import { activitySearch, readActivityUrl, type ActivityTab } from "@/features/admin/activity/activity-url";
import { AdminEmailList } from "@/features/admin/activity/admin-email-list";
import { DateRangeButton } from "@/features/admin/activity/date-range-button";
import { tabBadges, type SummaryAction, type TabBadge } from "@/features/admin/activity/today-summary";
import { TodaySummaryCard } from "@/features/admin/activity/today-summary-card";
import { useSession } from "@/features/auth/use-session";
import { useAdminAuditFeed, useAdminBusinesses, useAdminEmails, useAdminStats } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { data, getErrorMessage, type AdminAuditFilters } from "@/lib/data";
import { plural } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AdminEmailFilter, AuditEntityType } from "@/types";

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

type AuditQuery = Omit<AdminAuditFilters, "cursor">;

/**
 * /admin → Actividad (spec 049): arriba, cómo va hoy en una frase; debajo, una pestaña a la vez (Acciones,
 * Seguridad y Emails). La pestaña va en la dirección: siguen valiendo `?ver=seguridad` (los avisos de seguridad)
 * y `?emails=hoy|fallidos|todos` («Ver emails» del Inicio).
 */
export default function AdminActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const request = readActivityUrl(searchParams);
  const tab: ActivityTab = request.tab ?? "actions";
  const emailFilter: AdminEmailFilter = request.emailFilter ?? "all";

  const [scope, setScope] = useState<"admin" | "all">("admin");
  const [filters, setFilters] = useState(EMPTY_AUDIT_FILTERS);
  const [businessId, setBusinessId] = useState("all");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const businesses = useAdminBusinesses();
  const stats = useAdminStats();
  const health = stats.data?.health;
  const badges = health ? tabBadges(health) : { security: null, emails: null };
  const { session } = useSession();

  const actionsQuery = useMemo<AuditQuery>(
    () => ({ ...toAuditQuery(filters), scope, businessId: businessId === "all" ? undefined : businessId }),
    [filters, scope, businessId],
  );
  const securityQuery = useMemo<AuditQuery>(
    () => ({
      ...toAuditQuery(filters),
      entityType: undefined,
      scope: "security",
      businessId: businessId === "all" ? undefined : businessId,
      action: onlyFailed ? "session.login_failed" : undefined,
    }),
    [filters, businessId, onlyFailed],
  );

  // Cambiar de pestaña queda en el historial (Atrás vuelve); cambiar el filtro de los emails, no.
  const goTo = (next: ActivityTab, filter?: AdminEmailFilter, replace = false) =>
    setSearchParams(new URLSearchParams(activitySearch(next, next === "emails" ? (filter ?? emailFilter) : undefined)), { replace });
  const runAction = (action: SummaryAction) => {
    if (action.onlyFailed) setOnlyFailed(true);
    goTo(action.tab, action.emailFilter);
  };
  const clearFilters = () => {
    setFilters(EMPTY_AUDIT_FILTERS);
    setBusinessId("all");
    setOnlyFailed(false);
  };

  const exportCsv = async () => {
    const query = tab === "security" ? securityQuery : actionsQuery;
    setExporting(true);
    try {
      const count = await exportAuditCsv(
        (cursor) => data.admin.listAuditLogs({ ...query, cursor, limit: 1000 }),
        `auditoria-${query.scope}-${getZonedNow(DEFAULT_TIMEZONE).date}.csv`,
      );
      toast.success(count ? `Exportaste ${plural(count, "entrada", "entradas")}` : "No hay actividad con esos filtros");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const businessSelect = (
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
  );
  const dates = (
    <DateRangeButton value={{ from: filters.from, to: filters.to }} onChange={(range) => setFilters({ ...filters, ...range })} />
  );

  return (
    <div className="space-y-6">
      <PageTitle title="Actividad de la plataforma" />
      <PageHeader title="Actividad" description="Lo que pasó en la plataforma: acciones, inicios de sesión y emails." />

      {stats.isPending ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : health ? (
        <TodaySummaryCard health={health} onAction={runAction} />
      ) : null}

      <Tabs value={tab} onValueChange={(value) => goTo(value as ActivityTab)} className="gap-5">
        <div className="flex items-end justify-between gap-3 border-b">
          <div className="min-w-0 overflow-x-auto">
            <TabsList variant="line" aria-label="Qué ver" className="gap-3 p-0 group-data-horizontal/tabs:h-11 sm:gap-7">
              <TabsTrigger value="actions" className={TAB_CLASS}>
                Acciones
              </TabsTrigger>
              <TabsTrigger value="security" className={TAB_CLASS}>
                Seguridad
                <CountBadge badge={badges.security} />
              </TabsTrigger>
              <TabsTrigger value="emails" className={TAB_CLASS}>
                Emails
                <CountBadge badge={badges.emails} />
              </TabsTrigger>
            </TabsList>
          </div>
          {tab !== "emails" && (
            <Button type="button" variant="outline" size="sm" className="mb-2 shrink-0" disabled={exporting} onClick={exportCsv}>
              {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              <span className="sr-only sm:not-sr-only">Exportar</span>
            </Button>
          )}
        </div>

        <TabsContent value="actions" className="grid gap-4">
          <AuditFiltersBar
            value={filters}
            onChange={setFilters}
            types={TYPES}
            dates={false}
            leading={
              <Tabs value={scope} onValueChange={(value) => setScope(value as "admin" | "all")}>
                <TabsList aria-label="De quién" className="group-data-horizontal/tabs:h-9">
                  <TabsTrigger value="admin" className="px-3">
                    Super admin
                  </TabsTrigger>
                  <TabsTrigger value="all" className="px-3">
                    Todo
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            {businessSelect}
            {dates}
          </AuditFiltersBar>
          <AuditPanel query={actionsQuery} currentUserId={session?.userId} onClearFilters={clearFilters} />
        </TabsContent>

        <TabsContent value="security" className="grid gap-4">
          <AuditFiltersBar value={filters} onChange={setFilters} dates={false}>
            {businessSelect}
            {dates}
            <label className="flex h-9 items-center gap-2 text-sm">
              <Switch checked={onlyFailed} onCheckedChange={setOnlyFailed} /> Sólo intentos fallidos
            </label>
          </AuditFiltersBar>
          <AuditPanel query={securityQuery} currentUserId={session?.userId} onClearFilters={clearFilters} />
        </TabsContent>

        <TabsContent value="emails">
          <EmailsPanel filter={emailFilter} onFilterChange={(filter) => goTo("emails", filter, true)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TAB_CLASS = "flex-none px-1 text-sm sm:text-[0.9375rem] after:bg-primary group-data-horizontal/tabs:after:bottom-0 data-active:text-ink";

/** La cifra de una pestaña: los intentos fallidos o los emails fallidos (en rojo) o en cola. */
function CountBadge({ badge }: { badge: TabBadge | null }) {
  if (!badge) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-px text-xs font-semibold tabular-nums",
        badge.tone === "alert" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
      )}
    >
      <span aria-hidden className="sm:hidden">
        {badge.count}
      </span>
      <span aria-hidden className="hidden sm:inline">
        {badge.label}
      </span>
      <span className="sr-only">, {badge.srLabel}</span>
    </span>
  );
}

/** Acciones o Seguridad: cada pestaña pide su actividad sólo cuando está abierta. */
function AuditPanel({ query, currentUserId, onClearFilters }: { query: AuditQuery; currentUserId?: string; onClearFilters: () => void }) {
  const feed = useAdminAuditFeed(query);
  return <ActivityLedger feed={feed} currentUserId={currentUserId} onClearFilters={onClearFilters} />;
}

/** Emails: los pide sólo con la pestaña abierta. */
function EmailsPanel({ filter, onFilterChange }: { filter: AdminEmailFilter; onFilterChange: (filter: AdminEmailFilter) => void }) {
  const outbox = useAdminEmails(filter);
  return <AdminEmailList outbox={outbox} filter={filter} onFilterChange={onFilterChange} />;
}
