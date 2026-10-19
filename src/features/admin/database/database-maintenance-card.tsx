import { CircleAlert, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { DatabaseMaintenance, DatabaseStats, DatabaseTableActivity } from "@/types";
import { connectionStateLabel, formatBytes, formatCount, isSectionError, WORKER_LABELS } from "./database-format";
import { HelpNote, SectionError } from "./database-parts";

/** Filas muertas que merecen la marca: más que las vivas y al menos estas. */
const DEAD_ROWS_WARN = 1000;
/** Conexiones abiertas desde las que se avisa (la parte del máximo de PostgreSQL). */
const CONNECTIONS_WARN_SHARE = 0.8;

const hasManyDeadRows = (table: DatabaseTableActivity) => table.deadRows >= DEAD_ROWS_WARN && table.deadRows > table.liveRows;

/** La frase de «Qué hacer»: filas muertas que se acumulan o conexiones cerca del máximo; si no, nada. */
function advice(maintenance: DatabaseMaintenance): string {
  const notes: string[] = [];
  const dirty = maintenance.tables.find(hasManyDeadRows);
  if (dirty) {
    notes.push(
      `«${dirty.label ?? dirty.name}» tiene más filas muertas que vivas: PostgreSQL la limpiará solo; si en unos días sigue igual, conviene revisarla.`,
    );
  }
  const { total, max } = maintenance.connections;
  if (max > 0 && total >= max * CONNECTIONS_WARN_SHARE) {
    notes.push(`Hay ${total} conexiones abiertas de ${max}: cerca del máximo, las peticiones nuevas pueden esperar.`);
  }
  return notes.length > 0 ? notes.join(" ") : "Nada que hacer: PostgreSQL limpia solo las filas muertas y las conexiones están lejos del máximo.";
}

const since = (iso: string | null) => (iso ? `desde el ${formatDateTime(iso)}` : "desde que arrancó la base");

/**
 * «Mantenimiento» (historia 1): las tablas con más escrituras y sus filas muertas y su última limpieza, los
 * índices que nunca se usaron y las conexiones abiertas ahora. Las tablas se desplazan dentro de su
 * recuadro en el celular.
 */
export function DatabaseMaintenanceCard({ stats }: { stats: DatabaseStats }) {
  const { maintenance } = stats;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Wrench className="size-4 text-muted-foreground" aria-hidden /> Mantenimiento
        </CardTitle>
        <CardDescription>
          Cuando una fila se cambia o se borra, PostgreSQL guarda la versión vieja (una fila muerta) hasta que la limpia solo (vacuum). Los índices
          que nunca se usan ocupan sitio y hacen más lentas las escrituras.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSectionError(maintenance) ? (
          <SectionError message={maintenance.error} />
        ) : (
          <>
            <HelpNote>{advice(maintenance)}</HelpNote>

            <section className="space-y-2" aria-labelledby="maintenance-writes">
              <h3 id="maintenance-writes" className="text-sm font-semibold">
                Las tablas con más escrituras <span className="font-normal text-muted-foreground">({since(maintenance.since)})</span>
              </h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-3">Tabla</TableHead>
                      <TableHead className="text-right">Escrituras</TableHead>
                      <TableHead className="text-right">Vivas</TableHead>
                      <TableHead className="text-right">Muertas</TableHead>
                      <TableHead className="pr-3">Última limpieza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.tables.map((table) => (
                      <TableRow key={`${table.schema}.${table.name}`}>
                        <TableCell className="max-w-56 pl-3">
                          <span className="block truncate font-medium">{table.label ?? table.name}</span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {table.schema === "public" ? table.name : `${table.schema}.${table.name}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatCount(table.writes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCount(table.liveRows)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {hasManyDeadRows(table) ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                              <CircleAlert className="size-3.5" aria-label="Más muertas que vivas" /> {formatCount(table.deadRows)}
                            </span>
                          ) : (
                            formatCount(table.deadRows)
                          )}
                        </TableCell>
                        <TableCell className="pr-3 whitespace-nowrap text-muted-foreground">
                          {table.lastVacuumAt ? formatDateTime(table.lastVacuumAt) : "Todavía no"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="space-y-2" aria-labelledby="maintenance-indexes">
              <h3 id="maintenance-indexes" className="text-sm font-semibold">
                Índices que nunca se usaron <span className="font-normal text-muted-foreground">({since(maintenance.since)})</span>
              </h3>
              {maintenance.unusedIndexes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos los índices de Agenda360 se usaron.</p>
              ) : (
                <>
                  <div className="max-h-80 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-3">Índice</TableHead>
                          <TableHead>Tabla</TableHead>
                          <TableHead className="pr-3 text-right">Ocupa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenance.unusedIndexes.map((index) => (
                          <TableRow key={index.name}>
                            <TableCell className="pl-3 font-mono text-xs">{index.name}</TableCell>
                            <TableCell className="whitespace-nowrap">{index.tableLabel ?? index.table}</TableCell>
                            <TableCell className="pr-3 text-right tabular-nums">{formatBytes(index.bytes)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No los borres sin mirar: algunos sirven a pantallas o tareas que se usan poco (una vez al mes, por ejemplo) y, si las estadísticas
                    se reiniciaron hace poco, todavía no les tocó.
                  </p>
                </>
              )}
            </section>

            <section className="space-y-2" aria-labelledby="maintenance-connections">
              <h3 id="maintenance-connections" className="text-sm font-semibold">
                Conexiones abiertas ahora{" "}
                <span className="font-normal text-muted-foreground">
                  ({maintenance.connections.total} de {maintenance.connections.max} como máximo)
                </span>
              </h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-3">Quién</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="pr-3 text-right">Cuántas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.connections.byRole.map((row) => (
                      <TableRow key={`${row.role}|${row.state}`}>
                        <TableCell className="pl-3 whitespace-nowrap">{WORKER_LABELS[row.who]}</TableCell>
                        <TableCell className="font-mono text-xs">{row.role || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{connectionStateLabel(row.state)}</TableCell>
                        <TableCell className="pr-3 text-right tabular-nums">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
