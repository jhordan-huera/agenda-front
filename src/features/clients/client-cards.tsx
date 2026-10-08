import { Eye, Mail, MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { UserAvatar } from "@/components/shared/user-avatar";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { capitalize, formatShortDate, plural } from "@/lib/format";
import type { ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, Client } from "@/types";
import { getClientSummary, type ClientSummary } from "./client-summary";

interface ClientCardsProps {
  clients: Client[];
  summaries: Map<string, ClientSummary>;
  now: ZonedNow;
  business: Business | null | undefined;
  onEdit: (client: Client) => void;
  /** Sin esta acción (rol sin permiso) no se muestra "Eliminar". */
  onDelete?: (client: Client) => void;
}

/**
 * Clientes en tarjetas: quién es (nombre y cédula), cuándo vuelve (próxima cita, resaltada si es
 * hoy) y cómo contactarlo sin abrir la ficha (llamar, WhatsApp, email). Toda la tarjeta abre la ficha.
 */
export function ClientCards({ clients, summaries, now, business, onEdit, onDelete }: ClientCardsProps) {
  const navigate = useNavigate();

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => {
        const summary = getClientSummary(summaries, client.id);
        const next = summary.nextAppointment;
        const last = summary.lastAppointment;
        const nextIsToday = next?.date === now.date;
        const whatsAppUrl =
          client.phone && business
            ? getWhatsAppUrl(client.phone, business.timezone, `Hola ${client.name.split(" ")[0]}, te escribimos de ${business.name}.`)
            : null;

        return (
          <li
            key={client.id}
            className={cn(
              "group relative flex flex-col rounded-xl border bg-card p-5 transition-[border-color,box-shadow] duration-150 hover:border-ink/30 hover:shadow-[0_12px_28px_-18px_rgb(29_36_51/0.35)]",
              !client.isActive && "bg-muted/50",
            )}
          >
            <div className="flex items-start gap-3">
              <UserAvatar name={client.name} className="size-11" />
              <div className="min-w-0 flex-1">
                {/* El enlace cubre toda la tarjeta; los botones de abajo quedan por encima. */}
                <Link
                  to={`/dashboard/clients/${client.id}`}
                  className="block truncate text-lg leading-snug font-bold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                >
                  {client.name}
                </Link>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {client.documentId ? `Cédula ${client.documentId}` : "Sin cédula"}
                  {!client.isActive && ", inactivo"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="relative z-10 -mt-1 -mr-2" aria-label={`Acciones para ${client.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => navigate(`/dashboard/clients/${client.id}`)}>
                    <Eye /> Ver ficha
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
            </div>

            <div className={cn("mt-4 rounded-lg px-3 py-2.5", next ? "bg-accent" : "bg-muted")}>
              <p className="text-xs font-semibold text-muted-foreground">Próxima cita</p>
              {next ? (
                <p className="mt-0.5 font-bold text-ink tabular-nums">
                  {nextIsToday ? "Hoy" : capitalize(formatShortDate(next.date))},{" "}
                  <span className={cn(nextIsToday && "marker")}>{next.startTime}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-muted-foreground">Sin cita agendada</p>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-3 pb-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Historial</dt>
                <dd className="font-semibold">{plural(summary.totalAppointments, "cita", "citas")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Última visita</dt>
                <dd className="font-semibold">{last ? capitalize(formatShortDate(last.date)) : "Ninguna"}</dd>
              </div>
            </dl>

            <div className="relative z-10 mt-auto flex items-center gap-2 border-t pt-3 [&:not(:has(*))]:hidden">
              {whatsAppUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={whatsAppUrl} target="_blank" rel="noreferrer">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                </Button>
              )}
              {client.phone && (
                <Button asChild size="icon-sm" variant="ghost" aria-label={`Llamar a ${client.name}`} title={client.phone}>
                  <a href={`tel:${client.phone}`}>
                    <Phone />
                  </a>
                </Button>
              )}
              {client.email && (
                <Button asChild size="icon-sm" variant="ghost" aria-label={`Escribir un email a ${client.name}`} title={client.email}>
                  <a href={`mailto:${client.email}`}>
                    <Mail />
                  </a>
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
