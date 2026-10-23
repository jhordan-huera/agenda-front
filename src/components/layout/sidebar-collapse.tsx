import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarCollapse } from "./sidebar-collapse-context";

/**
 * Encogido, el nombre de un icono al pasar el ratón o al llegar con el teclado, a la derecha. Completo, el
 * nombre ya está escrito y no hace falta. El icono lleva además su `aria-label` para los lectores de pantalla.
 */
export function RailTooltip({ label, children }: { label: string; children: ReactElement }) {
  const { collapsed } = useSidebarCollapse();
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** «Ocultar menú» / «Mostrar menú», abajo del menú. No sale en el cajón del celular. */
export function SidebarCollapseButton() {
  const { collapsed, toggle } = useSidebarCollapse();
  if (!toggle) return null;
  const label = collapsed ? "Mostrar menú" : "Ocultar menú";
  return (
    <RailTooltip label={label}>
      <Button
        variant="ghost"
        aria-label={collapsed ? label : undefined}
        className={cn("rounded-xl text-muted-foreground", collapsed ? "mx-auto flex size-10 p-0" : "w-full justify-start")}
        onClick={toggle}
      >
        {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        {!collapsed && label}
      </Button>
    </RailTooltip>
  );
}
