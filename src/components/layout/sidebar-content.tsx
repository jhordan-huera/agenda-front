import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { InstallAppButton } from "@/features/install/install-app";
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
      <div className="shrink-0 px-6 pt-6 pb-4">
        <Logo href="/dashboard" />
        <p className="mt-4 truncate font-bold">{business?.name ?? "…"}</p>
        <p className="text-sm text-muted-foreground">{role ? ROLE_LABELS[role] : "…"}</p>
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
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-sidebar-accent"
          >
            <span className="truncate">Página de reservas</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        )}
        <InstallAppButton />
        <PlanStatus onNavigate={onNavigate} />
        <UserMenu onNavigate={onNavigate} />
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
