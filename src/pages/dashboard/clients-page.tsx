import { LayoutGrid, List, Search, UserPlus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/use-permissions";
import { ClientCards } from "@/features/clients/client-cards";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { countAppointments, getClientSummary, summariesFromActivity } from "@/features/clients/client-summary";
import { ClientsTable } from "@/features/clients/clients-table";
import { DeleteClientDialog } from "@/features/clients/delete-client-dialog";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useClientActivity } from "@/hooks/queries/use-appointments";
import { useClients } from "@/hooks/queries/use-clients";
import { useBusinessNow } from "@/hooks/use-business-now";
import { useMediaQuery } from "@/hooks/use-media-query";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";

type ClientFilter = "all" | "active" | "inactive" | "upcoming";

const FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "upcoming", label: "Con próxima cita" },
];

type ClientView = "cards" | "list";

// Preferencia de esta persona en este navegador (no es un dato del negocio).
const VIEW_KEY = "agenda360:clients-view";

function readView(): ClientView {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
}

function saveView(view: ClientView) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Sin almacenamiento disponible: la vista vale sólo para esta visita.
  }
}

export default function ClientsPage() {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const clientsQuery = useClients();
  const activity = useClientActivity();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [formState, setFormState] = useState<{ open: boolean; client?: Client }>({ open: false });
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [view, setView] = useState<ClientView>(readView);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { can } = usePermissions();

  // Última y próxima cita de cada cliente: las calcula la API (no se descarga el historial).
  const summaries = useMemo(() => summariesFromActivity(activity.data ?? []), [activity.data]);
  const clients = clientsQuery.data ?? [];

  const filtered = clients.filter((client) => {
    const term = normalizeSearch(search.trim());
    const matchesSearch =
      !term ||
      [client.name, client.documentId, client.email, client.phone].some((value) => normalizeSearch(value).includes(term));
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && client.isActive) ||
      (filter === "inactive" && !client.isActive) ||
      (filter === "upcoming" && Boolean(getClientSummary(summaries, client.id).nextAppointment));
    return matchesSearch && matchesFilter;
  });

  const openCreate = () => setFormState({ open: true });
  const chooseView = (next: ClientView) => {
    setView(next);
    saveView(next);
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Clientes" />
      <PageHeader
        title="Clientes"
        description={clientsQuery.isSuccess ? `${clients.length} clientes registrados` : "Tu cartera de clientes"}
        actions={
          <Button size="lg" onClick={openCreate}>
            <UserPlus /> Nuevo cliente
          </Button>
        }
      />

      {clientsQuery.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : clientsQuery.isError ? (
        <ErrorState onRetry={() => clientsQuery.refetch()} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no tienes clientes"
          description="Registra tu primer cliente o comparte tu página de reservas para que lleguen solos."
          action={
            <Button onClick={openCreate}>
              <UserPlus /> Crear cliente
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Buscar clientes"
                placeholder="Buscar por nombre, cédula, email o teléfono…"
                className="h-9 bg-background pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as ClientFilter)}>
              <SelectTrigger aria-label="Filtrar clientes" className="h-9 w-full bg-background sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* En el móvil siempre tarjetas: la lista (tabla) sólo se ofrece en pantallas anchas. */}
            <div role="group" aria-label="Vista" className="hidden h-9 shrink-0 self-start rounded-md border bg-background p-0.5 md:inline-flex">
              {(
                [
                  { value: "cards", label: "Tarjetas", icon: LayoutGrid },
                  { value: "list", label: "Lista", icon: List },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={view === option.value}
                  onClick={() => chooseView(option.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                    view === option.value && "bg-accent text-ink hover:text-ink",
                  )}
                >
                  <option.icon className="size-4" aria-hidden />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No hay clientes que coincidan con la búsqueda o el filtro."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  <X /> Limpiar filtros
                </Button>
              }
            />
          ) : view === "cards" || !isDesktop ? (
            <ClientCards
              clients={filtered}
              summaries={summaries}
              now={now}
              business={business}
              onEdit={(client) => setFormState({ open: true, client })}
              onDelete={can("clients.delete") ? setDeleting : undefined}
            />
          ) : (
            <ClientsTable
              clients={filtered}
              summaries={summaries}
              onEdit={(client) => setFormState({ open: true, client })}
              onDelete={can("clients.delete") ? setDeleting : undefined}
            />
          )}
        </>
      )}

      <ClientFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((current) => ({ ...current, open }))}
        client={formState.client}
      />
      <DeleteClientDialog
        client={deleting}
        appointmentCount={deleting ? countAppointments(getClientSummary(summaries, deleting.id)) : 0}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  );
}
