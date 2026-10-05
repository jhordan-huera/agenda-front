import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  IdCard,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageTitle } from "@/components/shared/page-title";
import { ActiveBadge, StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentListItem } from "@/features/appointments/appointment-list-item";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { useAppointmentDialogs } from "@/features/appointments/use-appointment-dialogs";
import { usePermissions } from "@/features/auth/use-permissions";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { ClinicalRecordTab } from "@/features/clinical/clinical-record-tab";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { ClientNotesCard } from "@/features/clients/client-notes-card";
import { getClientSummary, summarizeByClient } from "@/features/clients/client-summary";
import { DeleteClientDialog } from "@/features/clients/delete-client-dialog";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useClient } from "@/hooks/queries/use-clients";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBusinessNow } from "@/hooks/use-business-now";
import { capitalize, formatCurrency, formatShortDate, formatTimeRange } from "@/lib/format";
import { isPast } from "@/lib/time";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export default function ClientDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const clientQuery = useClient(id);
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const appointmentsQuery = useAppointments({ clientId: id });
  const { servicesById } = useLookups();
  const dialogs = useAppointmentDialogs();
  const { can } = usePermissions();
  const clinicalAccess = useClinicalAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = clinicalAccess && searchParams.get("tab") === "historia" ? "historia" : "resumen";
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);
  const summary = getClientSummary(summarizeByClient(appointments, now), id);
  const upcoming = appointments.filter((a) => !isPast(a.date, a.startTime, now) && a.status !== "cancelled");
  const history = appointments.filter((a) => isPast(a.date, a.startTime, now) || a.status === "cancelled").reverse();
  const statsLoading = appointmentsQuery.isPending;

  if (clientQuery.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-16 w-72" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }
  if (clientQuery.isError) return <ErrorState onRetry={() => clientQuery.refetch()} />;

  const client = clientQuery.data;
  const whatsAppUrl =
    client?.phone && business
      ? getWhatsAppUrl(client.phone, business.timezone, `Hola ${client.name.split(" ")[0]}, te escribimos de ${business.name}.`)
      : null;
  if (!client) {
    return (
      <EmptyState
        icon={UserX}
        title="Cliente no encontrado"
        description="Puede que haya sido eliminado o que el enlace sea incorrecto."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard/clients">
              <ArrowLeft /> Volver a clientes
            </Link>
          </Button>
        }
      />
    );
  }

  const overview = (
    <>
      <MetricStrip
        loading={statsLoading}
        className="md:grid-cols-5 2xl:grid-cols-5"
        metrics={[
          { label: "Citas", value: summary.totalAppointments, hint: "No canceladas" },
          { label: "Completadas", value: summary.completed },
          { label: "Cancelaciones", value: summary.cancelled },
          { label: "No asistió", value: summary.noShow },
          { label: "Total gastado", value: formatCurrency(summary.totalSpent), hint: "Citas completadas" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Próximas citas</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No tiene citas programadas.</p>
              ) : (
                <ul className="-mx-3">
                  {upcoming.map((appointment) => (
                    <AppointmentListItem
                      key={appointment.id}
                      appointment={appointment}
                      title={getServiceName(servicesById, appointment.serviceId)}
                      subtitle={formatTimeRange(appointment.startTime, appointment.endTime)}
                      showDate
                      onClick={dialogs.openDetails}
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 pb-0">
            <CardHeader className="pb-4">
              <CardTitle>Historial de citas</CardTitle>
            </CardHeader>
            {history.length === 0 ? (
              <p className="px-4 pb-8 text-center text-sm text-muted-foreground">Todavía no hay citas en el historial.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="pl-4">Fecha</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead className="hidden sm:table-cell">Precio</TableHead>
                    <TableHead className="pr-4">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((appointment) => (
                    <TableRow
                      key={appointment.id}
                      className="cursor-pointer"
                      onClick={() => dialogs.openDetails(appointment)}
                    >
                      <TableCell className="pl-4 whitespace-nowrap">
                        {capitalize(formatShortDate(appointment.date))}{" "}
                        <span className="text-muted-foreground">{appointment.startTime}</span>
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {getServiceName(servicesById, appointment.serviceId)}
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">{formatCurrency(appointment.price)}</TableCell>
                      <TableCell className="pr-4">
                        <StatusBadge status={appointment.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-3">
                <IdCard className="size-4 text-muted-foreground" aria-hidden />
                {client.documentId ? (
                  <span>Cédula {client.documentId}</span>
                ) : (
                  <span className="text-muted-foreground">Sin cédula</span>
                )}
              </p>
              <p className="flex items-center gap-3">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="hover:underline">
                    {client.phone}
                  </a>
                ) : (
                  "Sin teléfono"
                )}
                {whatsAppUrl && (
                  <Button asChild variant="outline" size="xs" className="ml-auto">
                    <a href={whatsAppUrl} target="_blank" rel="noreferrer">
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  </Button>
                )}
              </p>
              <p className="flex items-center gap-3">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                {client.email ? (
                  <a href={`mailto:${client.email}`} className="truncate hover:underline">
                    {client.email}
                  </a>
                ) : (
                  "Sin email"
                )}
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                {client.address || "Sin dirección"}
              </p>
              <dl className="grid grid-cols-2 gap-3 border-t pt-3">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden /> Última cita
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {summary.lastAppointment ? capitalize(formatShortDate(summary.lastAppointment.date)) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarPlus className="size-3.5" aria-hidden /> Próxima cita
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {summary.nextAppointment
                      ? `${capitalize(formatShortDate(summary.nextAppointment.date))} · ${summary.nextAppointment.startTime}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <ClientNotesCard client={client} />
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <PageTitle title={client.name} />
      <Link
        to="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={client.name} size="lg" className="size-14 text-lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{client.name}</h1>
              <ActiveBadge active={client.isActive} />
            </div>
            <p className="text-sm text-muted-foreground">
              Cliente desde {formatShortDate(client.createdAt.slice(0, 10))}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={() => dialogs.openCreate({ clientId: client.id })}>
            <CalendarPlus /> Nueva cita
          </Button>
          <Button size="lg" variant="outline" onClick={() => setEditing(true)}>
            <Pencil /> Editar
          </Button>
          {can("clients.delete") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-lg" variant="outline" aria-label="Más acciones">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                  <Trash2 /> Eliminar cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {clinicalAccess ? (
        <Tabs value={tab} onValueChange={(value) => setSearchParams(value === "historia" ? { tab: value } : {}, { replace: true })}>
          <TabsList variant="folder">
            <TabsTrigger value="resumen" className="px-3">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="historia" className="px-3">
              Historia clínica
            </TabsTrigger>
          </TabsList>
          <TabsContent value="resumen" className="mt-4 space-y-6">
            {overview}
          </TabsContent>
          <TabsContent value="historia" className="mt-4">
            <ClinicalRecordTab client={client} />
          </TabsContent>
        </Tabs>
      ) : (
        overview
      )}

      {dialogs.dialogs}
      <ClientFormDialog open={editing} onOpenChange={setEditing} client={client} />
      <DeleteClientDialog
        client={deleting ? client : null}
        appointmentCount={appointments.length}
        onOpenChange={setDeleting}
        redirectTo="/dashboard/clients"
      />
    </div>
  );
}
