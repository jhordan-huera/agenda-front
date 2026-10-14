import { KeyRound, MoreHorizontal, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getFullName } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import type { AdminUserSummary } from "@/types";

/** Negocios de la cuenta con su rol (o "Super admin" / "Sin negocio"). */
export function UserBusinesses({ row: { user, memberships } }: { row: AdminUserSummary }) {
  if (user.platformRole) {
    return (
      <Badge>
        <ShieldCheck /> Super admin
      </Badge>
    );
  }
  if (memberships.length === 0) return <span className="text-muted-foreground">Sin negocio</span>;
  return memberships.map((m) => (
    <p key={m.businessId} className="truncate">
      <Link to={`/admin/businesses/${m.businessId}`} className="hover:underline">
        {m.businessName}
      </Link>{" "}
      <span className="text-muted-foreground">· {ROLE_LABELS[m.role]}</span>
    </p>
  ));
}

export function UserActions({ row: { user }, onPassword, onToggle }: { row: AdminUserSummary; onPassword: () => void; onToggle: () => void }) {
  if (user.platformRole) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${getFullName(user)}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onPassword}>
          <KeyRound /> Cambiar contraseña
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant={user.isActive ? "destructive" : "default"} onSelect={onToggle}>
          {user.isActive ? <UserX /> : <UserCheck />}
          {user.isActive ? "Desactivar acceso" : "Reactivar acceso"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
