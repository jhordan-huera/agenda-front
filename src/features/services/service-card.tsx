import { Clock, Globe, MoreHorizontal, Pencil, Power, Trash2, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describeServiceModes } from "@/lib/constants/business";
import { formatCurrency, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";
import { MODE_ICONS } from "./mode-icons";

interface ServiceCardProps {
  service: Service;
  /** Personas por sesión que cuentan (1 si el negocio no tiene las citas con varios pacientes). */
  people: number;
  /** Algún profesional activo lo atiende: sin eso no sale en la página de reservas. */
  offered: boolean;
  onEdit: (service: Service) => void;
  onToggleActive: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const PEOPLE_LABELS: Record<number, string> = { 1: "Individual", 2: "Pareja · 2 personas", 3: "Familia · 3 personas" };

/** Qué ve el cliente en la página de reservas: si el servicio sale y cómo se muestra su precio. */
function bookingPageText(service: Service, offered: boolean): string {
  if (!service.isActive) return "No sale en tu página (inactivo)";
  if (!offered) return "No sale en tu página: nadie lo atiende";
  if (!service.showPrice) return "En tu página, sin precio";
  return service.price === 0 ? "En tu página, como «Gratis»" : "En tu página, con su precio";
}

export function ServiceCard({ service, people, offered, onEdit, onToggleActive, onDelete }: ServiceCardProps) {
  const ModeIcon = MODE_ICONS[service.modes.find((mode) => mode !== "business") ?? "business"];
  const PeopleIcon = people > 1 ? Users : User;
  return (
    <Card className={cn("gap-4 px-5 py-5 transition-shadow hover:shadow-md", !service.isActive && "bg-muted/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h3 className="truncate font-semibold">{service.name}</h3>
          <ActiveBadge active={service.isActive} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${service.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => onEdit(service)}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleActive(service)}>
              <Power /> {service.isActive ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(service)}>
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {service.description || "Sin descripción."}
      </p>
      <dl className="grid gap-1.5 text-sm">
        <Detail icon={<PeopleIcon className="size-4" />} label="Tipo">
          {PEOPLE_LABELS[people] ?? PEOPLE_LABELS[1]}
        </Detail>
        <Detail icon={<ModeIcon className="size-4" />} label="Dónde se atiende">
          {describeServiceModes(service.modes)}
          {service.modes.includes("home") && service.homeVisitFee > 0 && ` · +${formatCurrency(service.homeVisitFee)} a domicilio`}
        </Detail>
        <Detail icon={<Globe className="size-4" />} label="Cómo lo ve el cliente en la página de reservas" muted={!service.isActive || !offered}>
          {bookingPageText(service, offered)}
        </Detail>
      </dl>
      <div className="flex items-end justify-between border-t pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" aria-hidden /> {formatDuration(service.durationMinutes)}
        </span>
        <span className="block text-xl font-semibold tabular-nums">
          {service.price === 0 && service.showPrice ? "Gratis" : formatCurrency(service.price)}
        </span>
      </div>
    </Card>
  );
}

function Detail({ icon, label, muted = false, children }: { icon: ReactNode; label: string; muted?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-2", muted ? "text-muted-foreground" : "text-foreground")}>
      <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
