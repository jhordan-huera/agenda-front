import { Clock, Home, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
import { formatCurrency, formatDuration, isPriceVisible } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Service } from "@/types";

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onToggleActive: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function ServiceCard({ service, onEdit, onToggleActive, onDelete }: ServiceCardProps) {
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
      <div className="flex items-end justify-between border-t pt-4">
        <span className="grid gap-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden /> {formatDuration(service.durationMinutes)}
          </span>
          {service.location !== "business" && (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Home className="size-4" aria-hidden />
              {service.location === "home" ? "A domicilio" : "Local o domicilio"}
              {service.homeVisitFee > 0 && ` · +${formatCurrency(service.homeVisitFee)}`}
            </span>
          )}
        </span>
        <span className="text-right">
          <span className="block text-xl font-semibold tabular-nums">{formatCurrency(service.price)}</span>
          {!isPriceVisible(service) && <span className="block text-xs text-muted-foreground">Oculto a los clientes</span>}
        </span>
      </div>
    </Card>
  );
}
