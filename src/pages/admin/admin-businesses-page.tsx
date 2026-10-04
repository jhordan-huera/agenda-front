import { Building2, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BusinessStatusBadge, PlanBadge } from "@/features/admin/business-badges";
import { CreateBusinessDialog } from "@/features/admin/create-business-dialog";
import { useAdminBusinesses } from "@/hooks/queries/use-admin";
import { PLANS } from "@/lib/constants/plans";
import { formatNumericDate, normalizeSearch } from "@/lib/format";
import type { BusinessStatus, PlanId } from "@/types";


export default function AdminBusinessesPage() {
  const navigate = useNavigate();
  const businesses = useAdminBusinesses();
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlanId | "all">("all");
  const [status, setStatus] = useState<BusinessStatus | "all">("all");
  const [creating, setCreating] = useState(false);

  const rows = (businesses.data ?? []).filter(({ business, owner, subscription }) => {
    const term = normalizeSearch(search.trim());
    const matchesSearch =
      !term || [business.name, business.slug, owner?.name ?? "", owner?.email ?? ""].some((v) => normalizeSearch(v).includes(term));
    return (
      matchesSearch &&
      (plan === "all" || subscription?.plan === plan) &&
      (status === "all" || business.status === status)
    );
  });

  return (
    <div className="space-y-6">
      <PageTitle title="Negocios" />
      <PageHeader
        title="Negocios"
        description={businesses.data ? `${businesses.data.length} negocios en la plataforma` : "Todos los negocios de la plataforma"}
        actions={
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus /> Nuevo negocio
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
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
        <Select value={plan} onValueChange={(value) => setPlan(value as PlanId | "all")}>
          <SelectTrigger aria-label="Filtrar por plan" className="h-9 w-full bg-background sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Todos los planes</SelectItem>
            {PLANS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as BusinessStatus | "all")}>
          <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-full bg-background sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {businesses.isPending ? (
        <ListSkeleton rows={6} />
      ) : businesses.isError ? (
        <ErrorState onRetry={() => businesses.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={businesses.data.length === 0 ? Building2 : Search}
          title={businesses.data.length === 0 ? "Aún no hay negocios" : "Sin resultados"}
          description={
            businesses.data.length === 0
              ? "Crea el primero o abre el registro público para que los profesionales se den de alta solos."
              : "No hay negocios que coincidan con la búsqueda o los filtros."
          }
          action={
            businesses.data.length === 0 ? (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Nuevo negocio
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setPlan("all");
                  setStatus("all");
                }}
              >
                <X /> Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Negocio</TableHead>
                <TableHead className="hidden md:table-cell">Propietario</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden lg:table-cell">Citas del mes</TableHead>
                <TableHead className="hidden lg:table-cell">Usuarios</TableHead>
                <TableHead className="hidden xl:table-cell">Alta</TableHead>
                <TableHead className="pr-4">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ business, owner, subscription, usage }) => (
                <TableRow
                  key={business.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin/businesses/${business.id}`)}
                >
                  <TableCell className="pl-4">
                    <Link
                      to={`/admin/businesses/${business.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block max-w-56 truncate font-medium hover:underline"
                    >
                      {business.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">/book/{business.slug}</p>
                  </TableCell>
                  <TableCell className="hidden max-w-56 md:table-cell">
                    <p className="truncate">{owner?.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{owner?.email}</p>
                  </TableCell>
                  <TableCell>{subscription && <PlanBadge plan={subscription.plan} />}</TableCell>
                  <TableCell className="hidden tabular-nums lg:table-cell">
                    {usage.appointmentsThisMonth}
                    {usage.limits.appointmentsPerMonth !== null && (
                      <span className="text-muted-foreground"> / {usage.limits.appointmentsPerMonth}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden tabular-nums lg:table-cell">
                    {usage.users}
                    {usage.limits.users !== null && <span className="text-muted-foreground"> / {usage.limits.users}</span>}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap xl:table-cell">
                    {formatNumericDate(business.createdAt.slice(0, 10))}
                  </TableCell>
                  <TableCell className="pr-4">
                    <BusinessStatusBadge status={business.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateBusinessDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
