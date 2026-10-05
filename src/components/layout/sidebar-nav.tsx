import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

export function SidebarNav({ items, label, onNavigate }: { items: NavItem[]; label: string; onNavigate?: () => void }) {
  return (
    <nav aria-label={label} className="flex-1 space-y-1 overflow-y-auto py-2 pl-3">
      {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "mr-3 flex h-10 items-center gap-3 rounded-md px-3 text-[0.9375rem] text-sidebar-foreground/85 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
              // Página actual: una pestaña de agenda del mismo papel que la hoja, unida a ella.
              isActive && "mr-0 rounded-r-none rounded-l-lg bg-background font-bold text-ink hover:bg-background hover:text-ink",
            )
          }
        >
          <Icon className="size-4" aria-hidden />
          {itemLabel}
        </NavLink>
      ))}
    </nav>
  );
}
