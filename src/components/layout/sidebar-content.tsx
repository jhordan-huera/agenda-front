import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { ROLE_LABELS } from "@/lib/permissions";
import { NAV_ITEMS } from "./nav-items";
import { PlanStatus } from "./plan-status";
import { SidebarNav } from "./sidebar-nav";
import { useSignOut } from "./use-sign-out";
import { UserMenu } from "./user-menu";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: business } = useCurrentBusiness();
  const { role, can } = usePermissions();
  const signOut = useSignOut();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href="/dashboard" />
      </div>

      <div className="mx-3 mb-2 rounded-lg border bg-background px-3 py-2.5">
        <p className="truncate text-sm font-medium">{business?.name ?? "…"}</p>
        <p className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : "…"}</p>
      </div>

      <SidebarNav
        label="Panel"
        items={NAV_ITEMS.filter((item) => !item.permission || can(item.permission))}
        onNavigate={onNavigate}
      />

      <div className="space-y-2 border-t p-3">
        {business && (
          <a
            href={`/book/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="truncate">Página de reservas</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        )}
        <PlanStatus onNavigate={onNavigate} />
        <UserMenu onNavigate={onNavigate} />
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
