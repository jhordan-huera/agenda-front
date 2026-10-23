import { useId } from "react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./nav-items";
import { RailTooltip } from "./sidebar-collapse";
import { useSidebarCollapse } from "./sidebar-collapse-context";

/**
 * Las páginas del menú, en grupos con su título (spec 036). Encogido, sólo los iconos: el nombre sale al
 * pasar el ratón o con el teclado, y los títulos se vuelven una línea fina.
 */
export function SidebarNav({ groups, label, onNavigate }: { groups: NavGroup[]; label: string; onNavigate?: () => void }) {
  const { collapsed } = useSidebarCollapse();
  const baseId = useId();

  return (
    <nav aria-label={label} className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-2">
      {groups.map((group, index) => {
        const titleId = `${baseId}-${index}`;
        return (
          <div key={group.label} role="group" aria-labelledby={titleId} className={cn(index > 0 && (collapsed ? "mt-2" : "mt-4"))}>
            {collapsed ? (
              <>
                <span id={titleId} className="sr-only">
                  {group.label}
                </span>
                {index > 0 && <span aria-hidden className="mx-auto mb-2 block h-px w-6 bg-sidebar-border" />}
              </>
            ) : (
              <p id={titleId} className="px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ to, label: itemLabel, icon: Icon, end }) => (
                <RailTooltip key={to} label={itemLabel}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    aria-label={collapsed ? itemLabel : undefined}
                    // Una clase fija, no una función: la ayuda del menú encogido (Slot de Radix) sólo junta textos.
                    // La página actual (aria-current, que pone NavLink) va en el tono pálido de la marca.
                    className={cn(
                      "flex h-10 items-center rounded-xl text-[0.9375rem] whitespace-nowrap text-sidebar-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                      "aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground aria-[current=page]:hover:bg-sidebar-accent aria-[current=page]:hover:text-sidebar-accent-foreground",
                      collapsed ? "w-10 justify-center" : "gap-3 px-3",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {!collapsed && itemLabel}
                  </NavLink>
                </RailTooltip>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
