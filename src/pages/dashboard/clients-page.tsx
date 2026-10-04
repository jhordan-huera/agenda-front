import { Search, UserPlus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/features/auth/use-permissions";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { getClientSummary, summarizeByClient } from "@/features/clients/client-summary";
import { ClientsTable } from "@/features/clients/clients-table";
import { DeleteClientDialog } from "@/features/clients/delete-client-dialog";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useClients } from "@/hooks/queries/use-clients";
import { useBusinessNow } from "@/hooks/use-business-now";
import { normalizeSearch } from "@/lib/format";
import type { Client } from "@/types";

type ClientFilter = "all" | "active" | "inactive" | "upcoming";

const FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "upcoming", label: "Con próxima cita" },
];


export default function ClientsPage() {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const clientsQuery = useClients();
  const { data: appointments = [] } = useAppointments();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [formState, setFormState] = useState<{ open: boolean; client?: Client }>({ open: false });
  const [deleting, setDeleting] = useState<Client | null>(null);
  const { can } = usePermissions();

  const summaries = useMemo(() => summarizeByClient(appointments, now), [appointments, now]);
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
        <ListSkeleton rows={6} />
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
        appointmentCount={deleting ? appointments.filter((a) => a.clientId === deleting.id).length : 0}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  );
}
