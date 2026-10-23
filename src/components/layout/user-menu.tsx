import { ChevronsUpDown, ExternalLink, LogOut, Settings } from "lucide-react";
import { Link } from "react-router";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentBusiness, useCurrentUser } from "@/hooks/queries/use-account";
import { getFullName } from "@/lib/format";
import { useSignOut } from "./use-sign-out";

/** `compact`: sólo el avatar, con el nombre al pasar el ratón (el menú encogido, spec 036). */
export function UserMenu({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { data: user } = useCurrentUser();
  const { data: business } = useCurrentBusiness();
  const signOut = useSignOut();

  if (!user) return <Skeleton className={compact ? "mx-auto size-10 rounded-full" : "h-12 w-full"} />;
  const name = getFullName(user);

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              aria-label={`${name}: cuenta`}
              className="mx-auto flex size-10 items-center justify-center rounded-xl outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted"
            >
              <UserAvatar name={name} src={user.avatarUrl} />
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted">
          <UserAvatar name={name} src={user.avatarUrl} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        side={compact ? "right" : "top"}
        align={compact ? "end" : "start"}
        className={compact ? "min-w-56" : "w-(--radix-dropdown-menu-trigger-width) min-w-56"}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">{business?.name}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/settings" onClick={onNavigate}>
            <Settings /> Configuración
          </Link>
        </DropdownMenuItem>
        {business && (
          <DropdownMenuItem asChild>
            <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Ver mi página de reservas
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
