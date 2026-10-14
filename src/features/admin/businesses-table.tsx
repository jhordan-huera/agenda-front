import { Link, useNavigate } from "react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumericDate, toZonedDate } from "@/lib/format";
import type { AdminBusinessSummary } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "./business-badges";

/** Negocios en lista (spec 007: la vista «Lista», desde tablets). Es la tabla de siempre. */
export function BusinessesTable({ rows }: { rows: AdminBusinessSummary[] }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="pl-4">Negocio</TableHead>
            <TableHead className="hidden md:table-cell">Propietario</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="hidden lg:table-cell">Citas del mes</TableHead>
            <TableHead className="hidden lg:table-cell">Usuarios</TableHead>
            <TableHead className="hidden xl:table-cell">Alta</TableHead>
            <TableHead className="pr-4">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ business, owner, subscription, usage }) => (
            <TableRow key={business.id} className="cursor-pointer" onClick={() => navigate(`/admin/businesses/${business.id}`)}>
              <TableCell className="pl-4">
                <Link
                  to={`/admin/businesses/${business.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block max-w-56 truncate font-medium hover:underline"
                >
                  {business.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">/book/{business.slug}</p>
              </TableCell>
              <TableCell className="hidden max-w-56 md:table-cell">
                <p className={owner ? "truncate" : "truncate text-muted-foreground"}>{owner?.name ?? "Sin propietario"}</p>
                <p className="truncate text-xs text-muted-foreground">{owner?.email}</p>
              </TableCell>
              <TableCell>{subscription && <PlanBadge plan={subscription.plan} />}</TableCell>
              <TableCell className="hidden tabular-nums lg:table-cell">
                {usage.appointmentsThisMonth}
                {usage.limits.appointmentsPerMonth !== null && (
                  <span className="text-muted-foreground"> / {usage.limits.appointmentsPerMonth}</span>
                )}
              </TableCell>
              <TableCell className="hidden tabular-nums lg:table-cell">
                {usage.users}
                {usage.limits.users !== null && <span className="text-muted-foreground"> / {usage.limits.users}</span>}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap xl:table-cell">{formatNumericDate(toZonedDate(business.createdAt))}</TableCell>
              <TableCell className="pr-4">
                <BusinessStatusBadge status={business.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
