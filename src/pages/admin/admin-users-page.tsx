import { KeyRound, MoreHorizontal, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserStatusBadge } from "@/features/admin/business-badges";
import { usePasswordLinkDialog } from "@/features/admin/use-password-link-dialog";
import { useAdminUsers, useSetUserActive } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { formatNumericDate, getFullName, normalizeSearch, toZonedDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import type { AdminUserSummary } from "@/types";

type UserFilter = "all" | "owners" | "team" | "no_business" | "disabled";

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "owners", label: "Propietarios" },
  { value: "team", label: "Equipos (admin / staff)" },
  { value: "no_business", label: "Sin negocio" },
  { value: "disabled", label: "Desactivados" },
];


function matchesFilter({ user, memberships }: AdminUserSummary, filter: UserFilter) {
  switch (filter) {
    case "owners":
      return memberships.some((m) => m.role === "owner");
    case "team":
      return memberships.some((m) => m.role !== "owner");
    case "no_business":
      return !user.platformRole && memberships.length === 0;
    case "disabled":
      return !user.isActive;
    default:
      return true;
  }
}

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const setActive = useSetUserActive();
  const passwordLink = usePasswordLinkDialog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  // Se conserva el usuario al cerrar para que el texto no cambie durante la animación.
  const [toggleDialog, setToggleDialog] = useState<{ open: boolean; row: AdminUserSummary | null }>({ open: false, row: null });
  const toggling = toggleDialog.row;

  const rows = (users.data ?? []).filter((row) => {
    const term = normalizeSearch(search.trim());
    const matchesSearch =
      !term ||
      [getFullName(row.user), row.user.email, ...row.memberships.map((m) => m.businessName)].some((v) =>
        normalizeSearch(v).includes(term),
      );
    return matchesSearch && matchesFilter(row, filter);
  });

  return (
    <div className="space-y-6">
      <PageTitle title="Usuarios" />
      <PageHeader
        title="Usuarios"
        description="Todas las cuentas de la plataforma: propietarios, equipos y registros sin negocio."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre, email o negocio…"
            className="h-9 bg-background pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as UserFilter)}>
          <SelectTrigger aria-label="Filtrar usuarios" className="h-9 w-full bg-background sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {users.isPending ? (
        <ListSkeleton rows={8} />
      ) : users.isError ? (
        <ErrorState onRetry={() => users.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados" description="No hay usuarios que coincidan con la búsqueda o el filtro." />
      ) : (
        <>
          {/* En el móvil, una tarjeta por usuario (con su negocio y su rol); desde md, la tabla. */}
          <ul className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map((row) => {
              const { user } = row;
              const name = getFullName(user);
              return (
                <li key={user.id} className="space-y-3 rounded-xl border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar name={name} src={user.avatarUrl} size="sm" className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <UserActions
                      row={row}
                      onPassword={() => passwordLink.request({ id: user.id, name, email: user.email })}
                      onToggle={() => setToggleDialog({ open: true, row })}
                    />
                  </div>
                  <div className="space-y-0.5 text-sm">
                    <UserBusinesses row={row} />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
                    <span>Alta {formatNumericDate(toZonedDate(user.createdAt))}</span>
                    <UserStatusBadge active={user.isActive} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">Usuario</TableHead>
                  <TableHead>Negocio y rol</TableHead>
                  <TableHead className="hidden lg:table-cell">Alta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12 pr-4">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const { user } = row;
                  const name = getFullName(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={name} src={user.avatarUrl} size="sm" className="size-8" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <UserBusinesses row={row} />
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap lg:table-cell">
                        {formatNumericDate(toZonedDate(user.createdAt))}
                      </TableCell>
                      <TableCell>
                        <UserStatusBadge active={user.isActive} />
                      </TableCell>
                      <TableCell className="pr-4">
                        <UserActions
                          row={row}
                          onPassword={() => passwordLink.request({ id: user.id, name, email: user.email })}
                          onToggle={() => setToggleDialog({ open: true, row })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {passwordLink.dialog}
      <ConfirmDialog
        open={toggleDialog.open}
        onOpenChange={(open) => setToggleDialog((current) => ({ ...current, open }))}
        title={
          toggling?.user.isActive
            ? `¿Desactivar el acceso de ${toggling ? getFullName(toggling.user) : ""}?`
            : `¿Reactivar el acceso de ${toggling ? getFullName(toggling.user) : ""}?`
        }
        description={
          toggling?.user.isActive
            ? "No podrá iniciar sesión hasta que lo reactives. Sus datos y los de su negocio se conservan."
            : "Podrá volver a iniciar sesión con su contraseña."
        }
        confirmLabel={toggling?.user.isActive ? "Desactivar" : "Reactivar"}
        destructive={toggling?.user.isActive}
        onConfirm={async () => {
          if (!toggling) return;
          try {
            await setActive.mutateAsync({ userId: toggling.user.id, isActive: !toggling.user.isActive });
            toast.success(toggling.user.isActive ? "Acceso desactivado" : "Acceso reactivado");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}

/** Negocios de la cuenta con su rol (o "Super admin" / "Sin negocio"). */
function UserBusinesses({ row: { user, memberships } }: { row: AdminUserSummary }) {
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

function UserActions({ row: { user }, onPassword, onToggle }: { row: AdminUserSummary; onPassword: () => void; onToggle: () => void }) {
  if (user.platformRole) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${getFullName(user)}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={onPassword}>
          <KeyRound /> Enviar enlace para definir contraseña
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
