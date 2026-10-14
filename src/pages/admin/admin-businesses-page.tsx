import { Building2, CirclePause, Gauge, Plus, Search, Sparkles, Store, X } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessCard } from "@/features/admin/business-card";
import { BusinessesTable } from "@/features/admin/businesses-table";
import { CreateBusinessDialog } from "@/features/admin/create-business-dialog";
import { FilterChips } from "@/features/admin/filter-chips";
import { nearLimit } from "@/features/admin/sales-lists";
import { StatGrid } from "@/features/admin/stat-cards";
import { useViewPreference } from "@/features/admin/use-view-preference";
import { ViewToggle } from "@/features/admin/view-toggle";
import { useAdminBusinesses } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { PLANS } from "@/lib/constants/plans";
import { normalizeSearch, plural, toZonedDate } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import type { AdminBusinessSummary, BusinessStatus, PlanId } from "@/types";

type PlanFilter = PlanId | "all";
type StatusFilter = BusinessStatus | "all";

export default function AdminBusinessesPage() {
  const businesses = useAdminBusinesses();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlanFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewPreference("negocios");
  const today = getZonedNow(DEFAULT_TIMEZONE).date;

  const all = businesses.data ?? [];
  const term = normalizeSearch(search.trim());
  const matchesSearch = ({ business, owner }: AdminBusinessSummary) =>
    !term || [business.name, business.slug, owner?.name ?? "", owner?.email ?? ""].some((v) => normalizeSearch(v).includes(term));
  const matchesPlan = (row: AdminBusinessSummary, value: PlanFilter) => value === "all" || row.subscription?.plan === value;
  const matchesStatus = (row: AdminBusinessSummary, value: StatusFilter) => value === "all" || row.business.status === value;
  // Cada número cuenta con la búsqueda y el otro filtro: lo que quedaría al tocarlo.
  const searched = all.filter(matchesSearch);
  const planCount = (value: PlanFilter) => searched.filter((row) => matchesStatus(row, status) && matchesPlan(row, value)).length;
  const statusCount = (value: StatusFilter) => searched.filter((row) => matchesPlan(row, plan) && matchesStatus(row, value)).length;
  const rows = searched.filter((row) => matchesPlan(row, plan) && matchesStatus(row, status));

  const active = all.filter(({ business }) => business.status === "active").length;
  const fullCount = nearLimit(all).length;
  const clearFilters = () => {
    setSearch("");
    setPlan("all");
    setStatus("all");
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Negocios" />
      <PageHeader
        title="Negocios"
        description={businesses.data ? `${plural(all.length, "negocio", "negocios")} en la plataforma` : "Todos los negocios de la plataforma"}
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> Nuevo negocio
          </Button>
        }
      />

      <StatGrid
        loading={businesses.isPending}
        items={[
          { label: "Activos", value: active, icon: Store, hint: `de ${all.length} en total` },
          {
            label: "Suspendidos",
            value: all.length - active,
            icon: CirclePause,
            tone: all.length - active > 0 ? "warning" : "default",
            hint: all.length - active > 0 ? "Su panel y su página no funcionan" : "Ninguno",
          },
          {
            label: "Nuevos este mes",
            value: all.filter(({ business }) => toZonedDate(business.createdAt).slice(0, 7) === today.slice(0, 7)).length,
            icon: Sparkles,
          },
          {
            label: "Cerca del límite",
            value: fullCount,
            icon: Gauge,
            tone: fullCount > 0 ? "warning" : "default",
            hint: "80 % o más de su plan",
          },
        ]}
      />

      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Buscar negocios"
              placeholder="Buscar por negocio, enlace o propietario…"
              className="h-9 bg-background pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ViewToggle value={view} onChange={setView} />
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6">
          <FilterChips
            label="Plan"
            value={plan}
            onChange={setPlan}
            options={[
              { value: "all", label: "Todos los planes", count: planCount("all") },
              ...PLANS.map((option) => ({ value: option.id, label: option.name, count: planCount(option.id) })),
            ]}
          />
          <FilterChips
            label="Estado"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Todos los estados", count: statusCount("all") },
              { value: "active", label: "Activos", count: statusCount("active") },
              { value: "suspended", label: "Suspendidos", count: statusCount("suspended") },
            ]}
          />
        </div>
      </div>

      {businesses.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : businesses.isError ? (
        <ErrorState onRetry={() => businesses.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={all.length === 0 ? Building2 : Search}
          title={all.length === 0 ? "Aún no hay negocios" : "Sin resultados"}
          description={
            all.length === 0
              ? "Crea el primero o abre el registro público para que los profesionales se den de alta solos."
              : "No hay negocios que coincidan con la búsqueda o los filtros."
          }
          action={
            all.length === 0 ? (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Nuevo negocio
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                <X /> Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* En el celular siempre tarjetas; desde tablets, lo que se eligió. */}
          <ul className={view === "lista" ? "grid grid-cols-1 gap-4 md:hidden" : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"}>
            {rows.map((row) => (
              <li key={row.business.id}>
                <BusinessCard summary={row} today={today} />
              </li>
            ))}
          </ul>
          {view === "lista" && (
            <div className="hidden md:block">
              <BusinessesTable rows={rows} />
            </div>
          )}
        </>
      )}

      <CreateBusinessDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
