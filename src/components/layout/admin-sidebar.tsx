import { LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/queries/use-account";
import { getFullName } from "@/lib/format";
import { ADMIN_NAV_ITEMS } from "./nav-items";
import { SidebarNav } from "./sidebar-nav";
import { useSignOut } from "./use-sign-out";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo href="/admin" />
      </div>

      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Panel de plataforma</p>
          <p className="text-xs text-muted-foreground">Super admin</p>
        </div>
      </div>

      <SidebarNav label="Plataforma" items={ADMIN_NAV_ITEMS} onNavigate={onNavigate} />

      <div className="space-y-2 border-t p-3">
        {user ? (
          <div className="flex items-center gap-3 rounded-lg p-2">
            <UserAvatar name={getFullName(user)} src={user.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{getFullName(user)}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </div>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
