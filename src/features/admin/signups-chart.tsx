import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize, formatDate, plural } from "@/lib/format";
import type { PlatformStats } from "@/types";

/**
 * Negocios creados por mes (registro propio o alta del super admin), en barras pequeñas con su
 * cifra encima: con pocos negocios, un gráfico grande queda casi vacío.
 */
export function SignupsChart({ data }: { data: PlatformStats["signupsByMonth"] }) {
  const max = Math.max(1, ...data.map((point) => point.count));
  const thisMonth = data.at(-1)?.count ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Altas de negocios</CardTitle>
        <CardDescription>{thisMonth > 0 ? `${plural(thisMonth, "negocio nuevo", "negocios nuevos")} este mes.` : "Ninguno nuevo este mes."}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex h-28 items-end gap-2" aria-label="Negocios creados por mes, últimos 6 meses">
          {data.map(({ month, count }) => (
            <li key={month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold tabular-nums">{count}</span>
              <span
                className="w-full rounded-t-md bg-primary/80"
                style={{ height: `${Math.max(4, (count / max) * 72)}px` }}
                aria-hidden
              />
              <span className="text-xs text-muted-foreground">{capitalize(formatDate(`${month}-01`, "MMM"))}</span>
              <span className="sr-only">{capitalize(formatDate(`${month}-01`, "MMMM yyyy"))}: {count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
