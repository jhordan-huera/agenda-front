import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-items";

export function SidebarNav({ items, label, onNavigate }: { items: NavItem[]; label: string; onNavigate?: () => void }) {
  return (
    <nav aria-label={label} className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
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
