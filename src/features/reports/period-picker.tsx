import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDaysISO } from "@/lib/time";
import type { ISODate } from "@/types";
import { rangeError, recentMonths, REPORT_DAY_OPTIONS, type ReportPeriodChoice } from "./report-period";

type Mode = "7" | "30" | "90" | "month" | "range";

const modeOf = (choice: ReportPeriodChoice): Mode => (choice.kind === "days" ? (String(choice.days) as Mode) : choice.kind);

/**
 * El periodo del reporte: los últimos días, un mes (para el cierre) o unas fechas (hasta un año). Las
 * fechas sólo se aplican cuando son válidas; mientras tanto se explica qué falta.
 */
export function PeriodPicker({ value, onChange, today }: { value: ReportPeriodChoice; onChange: (choice: ReportPeriodChoice) => void; today: ISODate }) {
  const [mode, setMode] = useState<Mode>(modeOf(value));
  const [draft, setDraft] = useState<{ from: ISODate | ""; to: ISODate | "" }>(() =>
    value.kind === "range" ? { from: value.from, to: value.to } : { from: addDaysISO(today, -29), to: today },
  );
  const months = recentMonths(today);
  const month = value.kind === "month" ? value.month : months[0].value;
  const error = mode === "range" ? rangeError(draft.from, draft.to) : null;

  const choose = (next: Mode) => {
    setMode(next);
    if (next === "month") onChange({ kind: "month", month });
    else if (next === "range") {
      if (!rangeError(draft.from, draft.to)) onChange({ kind: "range", from: draft.from as ISODate, to: draft.to as ISODate });
    } else onChange({ kind: "days", days: Number(next) as (typeof REPORT_DAY_OPTIONS)[number] });
  };
  const setDates = (next: typeof draft) => {
    setDraft(next);
    if (!rangeError(next.from, next.to)) onChange({ kind: "range", from: next.from as ISODate, to: next.to as ISODate });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto print:hidden">
      <Tabs value={mode} onValueChange={(next) => choose(next as Mode)}>
        {/* En el celular, las cinco pestañas a lo ancho (caben desde 320 px). */}
        <TabsList aria-label="Periodo" className="w-full sm:w-fit">
          {REPORT_DAY_OPTIONS.map((days) => (
            <TabsTrigger key={days} value={String(days)} className="px-1.5 sm:px-3">
              {days} días
            </TabsTrigger>
          ))}
          <TabsTrigger value="month" className="px-1.5 sm:px-3">
            Mes
          </TabsTrigger>
          <TabsTrigger value="range" className="px-1.5 sm:px-3">
            Fechas
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === "month" && (
        <Select value={month} onValueChange={(next) => onChange({ kind: "month", month: next })}>
          <SelectTrigger aria-label="Mes" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {months.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="capitalize">{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {mode === "range" && (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Desde
            <Input type="date" className="sm:w-40" max={draft.to || undefined} value={draft.from} onChange={(e) => setDates({ ...draft, from: e.target.value })} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Hasta
            <Input type="date" className="sm:w-40" min={draft.from || undefined} value={draft.to} onChange={(e) => setDates({ ...draft, to: e.target.value })} />
          </label>
          {error && (
            <p role="alert" className="col-span-2 text-xs font-medium text-destructive sm:pb-2">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
