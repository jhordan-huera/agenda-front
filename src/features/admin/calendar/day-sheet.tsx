import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { BOARD_COLUMN_MARK, BOARD_COLUMN_TITLES } from "@/features/calendar/board-columns";
import { useAdminCalendarDay } from "@/hooks/queries/use-admin";
import { useMediaQuery } from "@/hooks/use-media-query";
import { capitalize, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminCalendarBusiness, AdminCalendarFilters, AdminCalendarStatusCounts, ISODate } from "@/types";
import { hourLabel } from "./calendar-figures";

export interface CalendarSelection {
  date: ISODate;
  /** null: el día entero. */
  hour: number | null;
}

/** Las cifras por estado, con los nombres y las marcas del tablero de la Agenda (spec 034). */
const STATUS_FIGURES: { key: keyof AdminCalendarStatusCounts; label: string; mark?: string }[] = [
  { key: "pending", label: BOARD_COLUMN_TITLES.pending, mark: BOARD_COLUMN_MARK.pending },
  { key: "confirmed", label: BOARD_COLUMN_TITLES.confirmed, mark: BOARD_COLUMN_MARK.confirmed },
  { key: "completed", label: BOARD_COLUMN_TITLES.completed, mark: BOARD_COLUMN_MARK.completed },
  { key: "paid", label: BOARD_COLUMN_TITLES.paid, mark: BOARD_COLUMN_MARK.paid },
  { key: "noShow", label: "No asistió" },
  { key: "cancelled", label: "Canceladas" },
];

const citas = (count: number) => (count === 1 ? "1 cita" : `${count} citas`);

function BusinessFigures({ business }: { business: AdminCalendarBusiness }) {
  return (
    <article className="space-y-3 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{business.name}</h3>
          {business.categoryName && <p className="truncate text-xs text-muted-foreground">{business.categoryName}</p>}
        </div>
        <p className="shrink-0 text-right">
          <span className="block text-2xl leading-none font-semibold tabular-nums">{business.appointments}</span>
          <span className="text-xs text-muted-foreground">{business.appointments === 1 ? "cita" : "citas"}</span>
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {STATUS_FIGURES.map(({ key, label, mark }) => {
          const value = business.counts[key];
          return (
            <div key={key} className={cn("flex items-center justify-between gap-2", value === 0 && "text-muted-foreground")}>
              <dt className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", mark ?? "bg-transparent")} />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          );
        })}
      </dl>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          Reserva online <strong className="tabular-nums">{business.online}</strong>
        </span>
        <span className={cn(business.unclosed > 0 ? "font-medium text-ink" : "text-muted-foreground")}>
          Sin cerrar <strong className="tabular-nums">{business.unclosed}</strong>
        </span>
      </p>

      {business.professionals.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">Por agenda</h4>
          <ul className="space-y-1 text-sm">
            {business.professionals.map((professional) => (
              <li key={professional.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{professional.name}</span>
                <span className="shrink-0 font-semibold tabular-nums">{professional.appointments}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button asChild variant="outline" size="sm" className="w-full">
        <Link to={`/admin/businesses/${business.id}`}>
          Ver ficha del negocio <ArrowRight />
        </Link>
      </Button>
    </article>
  );
}

interface DaySheetProps {
  selection: CalendarSelection | null;
  filters: AdminCalendarFilters;
  onClose: () => void;
  /** Al cerrarse: se abre sin disparador (lo abre un día o una hora), así que el foco vuelve a donde diga quien lo abre. */
  onCloseAutoFocus: (event: Event) => void;
}

/**
 * El panel de un día o de una hora del calendario de la plataforma (spec 035): cada negocio con sus citas
 * por estado, las online, las sin cerrar y las de cada agenda. Sólo cifras: ni pacientes, ni servicios,
 * ni notas, ni citas sueltas. A la derecha en el computador y desde abajo en el celular.
 */
export function DaySheet({ selection, filters, onClose, onCloseAutoFocus }: DaySheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Al cerrarse sigue mostrando lo último mientras se va (sin saltar a vacío en la animación).
  const [shown, setShown] = useState(selection);
  if (selection && selection !== shown) setShown(selection);
  const day = useAdminCalendarDay(shown, filters);
  const businesses = day.data?.businesses ?? [];
  const total = businesses.reduce((sum, business) => sum + business.appointments, 0);
  // Como el día del mes: cuentan los negocios con citas sin cancelar (los que sólo tienen canceladas salen igual).
  const withAppointments = businesses.filter((business) => business.appointments > 0).length;
  const title = shown
    ? `${capitalize(formatDate(shown.date, "EEEE d 'de' MMMM"))}${shown.hour === null ? "" : ` · ${hourLabel(shown.hour)}`}`
    : "Día";

  return (
    <Sheet open={selection !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl")}
      >
        <SheetHeader className="gap-1 border-b pr-12">
          <SheetTitle className="text-lg leading-snug font-semibold">{title}</SheetTitle>
          <SheetDescription>
            {day.isPending
              ? "Cargando las cifras…"
              : `${citas(total)} en ${withAppointments === 1 ? "1 negocio" : `${withAppointments} negocios`}${
                  shown?.hour === null ? "" : ", que empiezan a esa hora"
                }`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {day.isPending ? (
            <>
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </>
          ) : day.isError ? (
            <ErrorState onRetry={() => day.refetch()} />
          ) : businesses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay citas.</p>
          ) : (
            businesses.map((business) => <BusinessFigures key={business.id} business={business} />)
          )}
        </div>

        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          Sólo cifras: sin pacientes, servicios ni notas. Las citas de un negocio se ven en su modo soporte, cuando
          necesita asistencia.
        </p>
      </SheetContent>
    </Sheet>
  );
}
