import { UserAvatar } from "@/components/shared/user-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumericDate, getFullName, toZonedDate } from "@/lib/format";
import type { AdminUserSummary } from "@/types";
import { UserStatusBadge } from "./business-badges";
import { UserActions, UserBusinesses } from "./user-parts";

interface UsersTableProps {
  rows: AdminUserSummary[];
  onPassword: (row: AdminUserSummary) => void;
  onToggle: (row: AdminUserSummary) => void;
}

/** Cuentas en lista (spec 007: la vista «Lista», desde tablets). Es la tabla de siempre. */
export function UsersTable({ rows, onPassword, onToggle }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
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
                <TableCell className="hidden whitespace-nowrap lg:table-cell">{formatNumericDate(toZonedDate(user.createdAt))}</TableCell>
                <TableCell>
                  <UserStatusBadge active={user.isActive} />
                </TableCell>
                <TableCell className="pr-4">
                  <UserActions row={row} onPassword={() => onPassword(row)} onToggle={() => onToggle(row)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
