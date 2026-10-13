import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { InstallAppButton } from "@/features/install/install-app";
import { useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { ROLE_LABELS } from "@/lib/permissions";
import { NAV_ITEMS } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";
import { useSignOut } from "./use-sign-out";
import { UserMenu } from "./user-menu";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: business } = useCurrentBusiness();
  const { role, can } = usePermissions();
  const multiAgenda = useMultiAgendaAccess();
  const signOut = useSignOut();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 px-4 pt-6 pb-4">
        <Logo href="/dashboard" tone="inverse" className="px-2" />
        {/* El negocio, en su recuadro (como el espacio de trabajo de una aplicación). */}
        <div className="mt-5 rounded-xl border border-sidebar-border bg-white/[0.04] px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-white">{business?.name ?? "…"}</p>
          <p className="text-xs text-sidebar-foreground/70">{role ? ROLE_LABELS[role] : "…"}</p>
        </div>
      </div>

      <p className="px-6 pt-1 pb-1 text-[11px] font-semibold tracking-[0.08em] text-sidebar-foreground/50 uppercase">Menú</p>
      <SidebarNav
        label="Panel"
        items={NAV_ITEMS.filter((item) => (!item.permission || can(item.permission)) && (!item.multiAgenda || multiAgenda))}
        onNavigate={onNavigate}
      />

      <div className="space-y-1 border-t border-sidebar-border p-3">
        {business && (
          <a
            href={`/book/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring"
          >
            <span className="truncate">Página de reservas</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        )}
        <InstallAppButton />
        <UserMenu onNavigate={onNavigate} />
        <Button
          variant="ghost"
          className="w-full justify-start rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
          onClick={signOut}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
