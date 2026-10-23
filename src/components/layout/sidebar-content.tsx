import { ExternalLink, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { InstallAppButton } from "@/features/install/install-app";
import { useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { RailTooltip, SidebarCollapseButton } from "./sidebar-collapse";
import { useSidebarCollapse } from "./sidebar-collapse-context";
import { SidebarNav } from "./sidebar-nav";
import { useSignOut } from "./use-sign-out";
import { UserMenu } from "./user-menu";

/**
 * `bell`: la campana de avisos (spec 014), junto al logo; sólo en la computadora (en el celular va en la barra).
 * Encogido (spec 036): el símbolo, la campana debajo, los iconos del menú y la cuenta en su avatar.
 */
export function SidebarContent({ onNavigate, bell }: { onNavigate?: () => void; bell?: ReactNode }) {
  const { data: business } = useCurrentBusiness();
  const { role, can } = usePermissions();
  const multiAgenda = useMultiAgendaAccess();
  const signOut = useSignOut();
  const { collapsed } = useSidebarCollapse();
  const items = NAV_ITEMS.filter((item) => (!item.permission || can(item.permission)) && (!item.multiAgenda || multiAgenda));

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("shrink-0", collapsed ? "py-3" : "px-4 pt-6 pb-4")}>
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "justify-between gap-2")}>
          <Logo href="/dashboard" className={collapsed ? undefined : "px-2"} markOnly={collapsed} />
          {bell}
        </div>
        {/* El negocio, en su recuadro (como el espacio de trabajo de una aplicación). */}
        {!collapsed && (
          <div className="mt-5 rounded-xl bg-muted px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{business?.name ?? "…"}</p>
            <p className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : "…"}</p>
          </div>
        )}
      </div>

      <SidebarNav label="Panel" groups={[{ label: "Menú", items }]} onNavigate={onNavigate} />

      <div className="space-y-1 border-t border-sidebar-border p-3">
        {business && (
          <RailTooltip label="Página de reservas">
            <a
              href={`/book/${business.slug}`}
              target="_blank"
              rel="noreferrer"
              aria-label={collapsed ? "Página de reservas (se abre en otra pestaña)" : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-semibold text-ink outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                collapsed ? "mx-auto size-10 justify-center" : "justify-between gap-2 px-3 py-2",
              )}
            >
              {!collapsed && <span className="truncate">Página de reservas</span>}
              <ExternalLink className={cn("shrink-0", collapsed ? "size-4" : "size-3.5")} aria-hidden />
            </a>
          </RailTooltip>
        )}
        <InstallAppButton compact={collapsed} />
        <UserMenu onNavigate={onNavigate} compact={collapsed} />
        <RailTooltip label="Cerrar sesión">
          <Button
            variant="ghost"
            aria-label={collapsed ? "Cerrar sesión" : undefined}
            className={cn("rounded-xl text-muted-foreground", collapsed ? "mx-auto flex size-10 p-0" : "w-full justify-start")}
            onClick={signOut}
          >
            <LogOut /> {!collapsed && "Cerrar sesión"}
          </Button>
        </RailTooltip>
        <SidebarCollapseButton />
      </div>
    </div>
  );
}
