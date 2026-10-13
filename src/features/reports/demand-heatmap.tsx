import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DayOfWeek } from "@/types";
import { heatmapKey, type Heatmap } from "./report-insights";

const DAY_NAMES: Record<DayOfWeek, { short: string; long: string }> = {
  1: { short: "Lun", long: "lunes" },
  2: { short: "Mar", long: "martes" },
  3: { short: "Mié", long: "miércoles" },
  4: { short: "Jue", long: "jueves" },
  5: { short: "Vie", long: "viernes" },
  6: { short: "Sáb", long: "sábado" },
  0: { short: "Dom", long: "domingo" },
};

const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/**
 * Cuándo piden citas: una tabla (accesible tal cual) con las horas en filas y los días en columnas;
 * cuanto más intenso el color, más citas empiezan a esa hora. El número siempre se ve.
 */
export function DemandHeatmap({ heatmap }: { heatmap: Heatmap }) {
  const { days, hours, counts, max } = heatmap;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Días y horas más pedidos</CardTitle>
        <CardDescription>Citas que empiezan cada día a cada hora en el periodo (sin canceladas): más color, más citas.</CardDescription>
      </CardHeader>
      <CardContent>
        {max === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin citas en este periodo.</p>
        ) : (
          <table className="w-full table-fixed border-separate border-spacing-0.5 text-center text-xs">
            <caption className="sr-only">Citas por día de la semana y hora de inicio</caption>
            <thead>
              <tr>
                <th scope="col" className="w-11">
                  <span className="sr-only">Hora</span>
                </th>
                {days.map((day) => (
                  <th key={day} scope="col" className="pb-1 font-medium text-muted-foreground">
                    <abbr title={DAY_NAMES[day].long} className="no-underline">
                      {DAY_NAMES[day].short}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <th scope="row" className="pr-1 text-right font-normal whitespace-nowrap text-muted-foreground tabular-nums">
                    {hourLabel(hour)}
                  </th>
                  {days.map((day) => {
                    const count = counts.get(heatmapKey(day, hour)) ?? 0;
                    // Hasta un 55 % del color principal: el número (oscuro) se lee con cualquier color de marca.
                    const intensity = count === 0 ? 0 : 10 + Math.round((count / max) * 45);
                    return (
                      <td
                        key={day}
                        className={count === 0 ? "h-7 rounded bg-muted/60 text-transparent" : "h-7 rounded font-semibold tabular-nums"}
                        style={
                          count === 0
                            ? undefined
                            : {
                                background: `color-mix(in oklch, var(--primary) ${intensity}%, var(--card))`,
                              }
                        }
                      >
                        {count}
                        <span className="sr-only"> citas el {DAY_NAMES[day].long} a las {hourLabel(hour)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
