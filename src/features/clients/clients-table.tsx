import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ActiveBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capitalize, formatShortDate } from "@/lib/format";
import type { Appointment, Client } from "@/types";
import { getClientSummary, type ClientSummary } from "./client-summary";

interface ClientsTableProps {
  clients: Client[];
  summaries: Map<string, ClientSummary>;
  onEdit: (client: Client) => void;
  /** Sin esta acción (rol sin permiso) no se muestra "Eliminar". */
  onDelete?: (client: Client) => void;
}

function AppointmentDate({ appointment }: { appointment?: Appointment }) {
  if (!appointment) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap">
      {capitalize(formatShortDate(appointment.date))} <span className="text-muted-foreground">{appointment.startTime}</span>
    </span>
  );
}

export function ClientsTable({ clients, summaries, onEdit, onDelete }: ClientsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="pl-4">Nombre</TableHead>
            <TableHead className="hidden md:table-cell">Cédula</TableHead>
            <TableHead className="hidden md:table-cell">Teléfono</TableHead>
            <TableHead className="hidden xl:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Última cita</TableHead>
            <TableHead className="hidden sm:table-cell">Próxima cita</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const summary = getClientSummary(summaries, client.id);
            return (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => navigate(`/dashboard/clients/${client.id}`)}
              >
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={client.name} size="sm" className="size-8" />
                    <div className="min-w-0">
                      <Link
                        to={`/dashboard/clients/${client.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground tabular-nums md:hidden">
                        {client.documentId ? `Cédula ${client.documentId}` : client.phone || client.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap tabular-nums md:table-cell">
                  {client.documentId || <span className="text-muted-foreground">Sin cédula</span>}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap md:table-cell">{client.phone || "—"}</TableCell>
                <TableCell className="hidden max-w-56 truncate xl:table-cell">{client.email || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <AppointmentDate appointment={summary.lastAppointment} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <AppointmentDate appointment={summary.nextAppointment} />
                </TableCell>
                <TableCell>
                  <ActiveBadge active={client.isActive} />
                </TableCell>
                <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${client.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => navigate(`/dashboard/clients/${client.id}`)}>
                        <Eye /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onEdit(client)}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(client)}>
                            <Trash2 /> Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
