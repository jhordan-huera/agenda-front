import { Database, FolderOpen } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "@/lib/format";
import type { DatabaseStats } from "@/types";
import { formatBytes, formatShare, isSectionError, levelOf } from "./database-format";
import { HelpNote, LevelPill, SectionError, SectionNotice, UsageBar } from "./database-parts";

const ADVICE = {
  ok: "Bien: no hay que hacer nada.",
  warn: "Pasa del 70 %: mira abajo qué ocupa más y piensa en un plan mayor de Supabase.",
  bad: "Pasa del 90 %: al llegar al tope, Supabase puede dejarla en sólo lectura. Toca pasar a un plan mayor.",
};

/** La base: el tamaño total frente al tope del plan de Supabase, con su estado (como la tarjeta de Salud). */
function SizeCard({ size }: { size: DatabaseStats["size"] }) {
  const share = isSectionError(size) ? 0 : size.sizeBytes / size.limitBytes;
  const level = levelOf(share);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" aria-hidden /> La base
        </CardTitle>
        {!isSectionError(size) && (
          <CardAction>
            <LevelPill level={level} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isSectionError(size) ? (
          <SectionError message={size.error} />
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-2xl font-bold tabular-nums">
                {formatBytes(size.sizeBytes)} <span className="text-base font-medium text-muted-foreground">de {formatBytes(size.limitBytes)}</span>
              </p>
              <UsageBar share={share} level={level} label="Lo que ocupa la base frente al tope del plan" />
              <p className="text-xs text-muted-foreground">{formatShare(share)} del tope del plan de Supabase (datos, índices y lo interno de PostgreSQL).</p>
            </div>
            <HelpNote>{ADVICE[level]}</HelpNote>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Los archivos (historias clínicas, comprobantes, logos y fotos), aparte: no cuentan en la base. */
function FilesCard({ files }: { files: DatabaseStats["files"] }) {
  const share = files && !isSectionError(files) ? files.totalBytes / files.limitBytes : 0;
  const level = levelOf(share);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <FolderOpen className="size-4 text-muted-foreground" aria-hidden /> Los archivos
        </CardTitle>
        {files && !isSectionError(files) && (
          <CardAction>
            <LevelPill level={level} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {files === null ? (
          <SectionNotice
            title="No disponible"
            description="Esta base no tiene Supabase Storage (en local los archivos van a una carpeta del equipo)."
          />
        ) : isSectionError(files) ? (
          <SectionError message={files.error} />
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-2xl font-bold tabular-nums">
                {formatBytes(files.totalBytes)} <span className="text-base font-medium text-muted-foreground">de {formatBytes(files.limitBytes)}</span>
              </p>
              <UsageBar share={share} level={level} label="Lo que ocupan los archivos frente a su tope" />
              {files.buckets.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {files.buckets.map((bucket) => (
                    <li key={bucket.bucket} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{bucket.label}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatBytes(bucket.bytes)} · {plural(bucket.files, "archivo", "archivos")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Todavía no hay archivos.</p>
              )}
            </div>
            <HelpNote>
              No cuentan en la base: Supabase los guarda aparte, con su propio tope.{" "}
              {level === "ok" ? "No hay que hacer nada." : "Se acercan al tope: los comprobantes se borran solos a los 3 meses; si sigue subiendo, toca un plan mayor."}
            </HelpNote>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Arriba de la pantalla: la base y los archivos, cada uno frente a su tope. */
export function DatabaseOverview({ stats }: { stats: DatabaseStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SizeCard size={stats.size} />
      <FilesCard files={stats.files} />
    </div>
  );
}
