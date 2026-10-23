import { LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InstallAppButton } from "@/features/install/install-app";
import { useCurrentUser } from "@/hooks/queries/use-account";
import { getFullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS } from "./nav-items";
import { RailTooltip, SidebarCollapseButton } from "./sidebar-collapse";
import { useSidebarCollapse } from "./sidebar-collapse-context";
import { SidebarNav } from "./sidebar-nav";
import { useSignOut } from "./use-sign-out";

/**
 * `bell`: la campana de avisos del super admin (spec 014), junto al logo; sólo en la computadora.
 * Encogido (spec 036): el símbolo, la campana debajo, los iconos del menú y la cuenta en su avatar.
 */
export function AdminSidebar({ onNavigate, bell }: { onNavigate?: () => void; bell?: ReactNode }) {
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex shrink-0 items-center", collapsed ? "flex-col gap-2 py-3" : "h-16 justify-between gap-2 px-5 pr-3")}>
        <Logo href="/admin" markOnly={collapsed} />
        {bell}
      </div>

      {!collapsed && (
        <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Panel de plataforma</p>
            <p className="text-xs text-muted-foreground">Super admin</p>
          </div>
        </div>
      )}

      <SidebarNav label="Plataforma" groups={ADMIN_NAV_GROUPS} onNavigate={onNavigate} />

      <div className="space-y-1 border-t border-sidebar-border p-3">
        <InstallAppButton compact={collapsed} />
        {!user ? (
          <Skeleton className={collapsed ? "mx-auto size-10 rounded-full" : "h-12 w-full"} />
        ) : collapsed ? (
          <RailTooltip label={`${getFullName(user)} · ${user.email}`}>
            <span tabIndex={0} className="mx-auto flex size-10 items-center justify-center rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <UserAvatar name={getFullName(user)} src={user.avatarUrl} />
              <span className="sr-only">
                {getFullName(user)}, {user.email}
              </span>
            </span>
          </RailTooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-lg p-2">
            <UserAvatar name={getFullName(user)} src={user.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{getFullName(user)}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </div>
        )}
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
