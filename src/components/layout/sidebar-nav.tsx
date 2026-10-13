import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

export function SidebarNav({ items, label, onNavigate }: { items: NavItem[]; label: string; onNavigate?: () => void }) {
  return (
    <nav aria-label={label} className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:ring-inset",
              // Página actual: resaltada en el menú oscuro, con el icono del color de resaltado.
              isActive && "bg-white/[0.11] font-semibold text-white hover:bg-white/[0.11]",
            )
          }
        >
          <Icon className="size-4 group-aria-[current=page]:text-highlight" aria-hidden />
          {itemLabel}
        </NavLink>
      ))}
    </nav>
  );
}
