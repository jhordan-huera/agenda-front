import { Building, Search, UserRound, UsersRound, UserX2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips } from "@/features/admin/filter-chips";
import { StatGrid } from "@/features/admin/stat-cards";
import { useSetPasswordDialog } from "@/features/admin/use-set-password-dialog";
import { useViewPreference } from "@/features/admin/use-view-preference";
import { UserCard } from "@/features/admin/user-card";
import { UsersTable } from "@/features/admin/users-table";
import { ViewToggle } from "@/features/admin/view-toggle";
import { useAdminUsers, useSetUserActive } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { getFullName, normalizeSearch } from "@/lib/format";
import type { AdminUserSummary } from "@/types";

type UserFilter = "all" | "owners" | "team" | "no_business" | "super_admin" | "disabled";

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "owners", label: "Propietarios" },
  { value: "team", label: "Equipos" },
  { value: "no_business", label: "Sin negocio" },
  { value: "super_admin", label: "Super admin" },
  { value: "disabled", label: "Desactivadas" },
];


function matchesFilter({ user, memberships }: AdminUserSummary, filter: UserFilter) {
  switch (filter) {
    case "owners":
      return memberships.some((m) => m.role === "owner");
    case "team":
      return memberships.some((m) => m.role !== "owner");
    case "no_business":
      return !user.platformRole && memberships.length === 0;
    case "super_admin":
      return Boolean(user.platformRole);
    case "disabled":
      return !user.isActive;
    default:
      return true;
  }
}

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const setActive = useSetUserActive();
  const setPassword = useSetPasswordDialog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [view, setView] = useViewPreference("usuarios");
  // Se conserva el usuario al cerrar para que el texto no cambie durante la animación.
  const [toggleDialog, setToggleDialog] = useState<{ open: boolean; row: AdminUserSummary | null }>({ open: false, row: null });
  const toggling = toggleDialog.row;

  const all = users.data ?? [];
  const term = normalizeSearch(search.trim());
  // Los números de los filtros cuentan con la búsqueda: lo que quedaría al tocarlos.
  const searched = all.filter(
    (row) =>
      !term ||
      [getFullName(row.user), row.user.email, ...row.memberships.map((m) => m.businessName)].some((v) => normalizeSearch(v).includes(term)),
  );
  const rows = searched.filter((row) => matchesFilter(row, filter));
  const count = (value: UserFilter) => all.filter((row) => matchesFilter(row, value)).length;
  const requestPassword = (row: AdminUserSummary) => {
    const name = getFullName(row.user);
    setPassword.request({ id: row.user.id, name, email: row.user.email });
  };
  const requestToggle = (row: AdminUserSummary) => setToggleDialog({ open: true, row });

  return (
    <div className="space-y-6">
      <PageTitle title="Usuarios" />
      <PageHeader
        title="Usuarios"
        description="Todas las cuentas de la plataforma: propietarios, equipos y registros sin negocio."
      />

      <StatGrid
        loading={users.isPending}
        items={[
          { label: "Cuentas", value: all.length, icon: UsersRound, hint: `${count("disabled")} desactivadas` },
          { label: "Propietarios", value: count("owners"), icon: Building },
          { label: "Equipos", value: count("team"), icon: UserRound, hint: "Administración, recepción y profesionales" },
          { label: "Sin negocio", value: count("no_business"), icon: UserX2, hint: "Se registraron y no crearon su negocio" },
        ]}
      />

      <div className="space-y-3">
        <div className="flex gap-3">
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
          <ViewToggle value={view} onChange={setView} />
        </div>
        <FilterChips
          label="Tipo de cuenta"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((option) => ({ ...option, count: searched.filter((row) => matchesFilter(row, option.value)).length }))}
        />
      </div>

      {users.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : users.isError ? (
        <ErrorState onRetry={() => users.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="No hay usuarios que coincidan con la búsqueda o el filtro."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              <X /> Limpiar filtros
            </Button>
          }
        />
      ) : (
        <>
          {/* En el celular siempre tarjetas; desde tablets, lo que se eligió. */}
          <ul className={view === "lista" ? "grid grid-cols-1 gap-4 md:hidden" : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"}>
            {rows.map((row) => (
              <li key={row.user.id}>
                <UserCard row={row} onPassword={() => requestPassword(row)} onToggle={() => requestToggle(row)} />
              </li>
            ))}
          </ul>
          {view === "lista" && (
            <div className="hidden md:block">
              <UsersTable rows={rows} onPassword={requestPassword} onToggle={requestToggle} />
            </div>
          )}
        </>
      )}

      {setPassword.dialog}
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
