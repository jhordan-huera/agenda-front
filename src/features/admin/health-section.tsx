import { CircleAlert, CircleCheck, CircleHelp, CircleX, Database, DatabaseBackup, Gauge, Mail, ShieldAlert, Timer, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { capitalize, formatShortDate, plural, toZonedDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ISODate, PlatformStats } from "@/types";
import { EmailsChart } from "./emails-chart";
import { daysSince } from "./sales-lists";

type Status = "ok" | "warn" | "bad" | "unknown";

/** Umbrales de la spec 006. */
const CRON_WARN_MINUTES = 30;
const CRON_BAD_MINUTES = 120;
const BACKUP_WARN_DAYS = 8;
const BACKUP_BAD_DAYS = 15;
/** Cupo de Gmail (spec 015): en ámbar desde el 80 % del cupo; en rojo al llegar al límite del paciente. */
const QUOTA_WARN_SHARE = 0.8;
/** Base de datos: en ámbar desde el 70 % del tope (como el aviso de ntfy de la copia, 350 de 500 MB); en rojo desde el 90 %. */
const DATABASE_WARN_SHARE = 0.7;
const DATABASE_BAD_SHARE = 0.9;

const STATUS: Record<Status, { icon: LucideIcon; label: string; className: string }> = {
  ok: { icon: CircleCheck, label: "Bien", className: "text-emerald-600" },
  warn: { icon: CircleAlert, label: "Revisar", className: "text-amber-600" },
  bad: { icon: CircleX, label: "Problema", className: "text-rose-600" },
  unknown: { icon: CircleHelp, label: "Sin datos", className: "text-muted-foreground" },
};

interface Tile {
  key: string;
  icon: LucideIcon;
  title: string;
  status: Status;
  main: ReactNode;
  detail: ReactNode;
}

/** "hace 4 min", "hace 3 h", "hace 2 días". */
function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `hace ${hours} h` : `hace ${Math.round(hours / 24)} días`;
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/** El cupo de Gmail: los envíos de 24 h frente al cupo y los que esperan (copias y avisos, después lo del paciente). */
function quotaTile({ quota, sent24h, patientLimit, waiting }: PlatformStats["health"]["emailQuota"]): Tile {
  const waitingTotal = waiting.patient + waiting.business;
  return {
    key: "quota",
    icon: Gauge,
    title: "Cupo de Gmail",
    status: sent24h >= patientLimit ? "bad" : sent24h >= quota * QUOTA_WARN_SHARE || waitingTotal > 0 ? "warn" : "ok",
    main: `${sent24h} de ${quota} (24 h)`,
    detail:
      waitingTotal > 0
        ? `${plural(waitingTotal, "espera", "esperan")} cupo: ${waiting.patient} al paciente · ${waiting.business} al negocio`
        : "Ningún email espera cupo",
  };
}

/** Lo que ocupa la base de datos frente al tope del plan de Supabase. */
function databaseTile(database: PlatformStats["health"]["database"]): Tile {
  if (!database) {
    return { key: "database", icon: Database, title: "Base de datos", status: "unknown", main: "No se pudo medir", detail: "Vuelve a intentarlo más tarde" };
  }
  const share = database.sizeBytes / database.limitBytes;
  return {
    key: "database",
    icon: Database,
    title: "Base de datos",
    status: share >= DATABASE_BAD_SHARE ? "bad" : share >= DATABASE_WARN_SHARE ? "warn" : "ok",
    main: `${formatSize(database.sizeBytes)} de ${formatSize(database.limitBytes)}`,
    detail:
      share >= DATABASE_WARN_SHARE
        ? `${Math.round(share * 100)} % del plan: toca pasar a un plan mayor de Supabase`
        : `${Math.max(1, Math.round(share * 100))} % del plan gratuito de Supabase`,
  };
}

function tiles(health: PlatformStats["health"], today: ISODate): Tile[] {
  const { emailsToday, emailQuota, cron, backup, database, security } = health;
  const cronMinutes = cron.lastRunAt ? (Date.now() - Date.parse(cron.lastRunAt)) / 60_000 : null;
  const backupDays = backup ? daysSince(backup.ranAt, today) : null;
  return [
    {
      key: "emails",
      icon: Mail,
      title: "Emails de hoy",
      status: emailsToday.failed > 0 ? "warn" : "ok",
      main: plural(emailsToday.sent, "enviado", "enviados"),
      detail: `${plural(emailsToday.failed, "fallido", "fallidos")} · ${emailsToday.queued} en cola`,
    },
    // Una API anterior a la spec 015 no lo trae.
    ...(emailQuota ? [quotaTile(emailQuota)] : []),
    {
      key: "cron",
      icon: Timer,
      title: "Cron",
      status:
        cronMinutes === null ? "warn" : cron.failures > 0 || cronMinutes > CRON_BAD_MINUTES ? "bad" : cronMinutes > CRON_WARN_MINUTES ? "warn" : "ok",
      main: cron.lastRunAt ? capitalize(ago(cron.lastRunAt)) : "Sin pasadas registradas",
      detail: cron.failures > 0 ? `${plural(cron.failures, "error", "errores")} en la última pasada` : cron.lastRunAt ? "Sin errores" : "",
    },
    {
      key: "backup",
      icon: DatabaseBackup,
      title: "Copia de seguridad",
      status: !backup
        ? "warn"
        : !backup.ok || (backupDays ?? 0) > BACKUP_BAD_DAYS
          ? "bad"
          : (backupDays ?? 0) > BACKUP_WARN_DAYS
            ? "warn"
            : "ok",
      main: backup ? `${backup.ok ? "" : "Falló: "}${capitalize(formatShortDate(toZonedDate(backup.ranAt)))}` : "Sin copias registradas todavía",
      detail: backup
        ? backup.ok
          ? `${ago(backup.ranAt)}${backup.sizeBytes ? ` · ${formatSize(backup.sizeBytes)}` : ""}`
          : backup.error || ago(backup.ranAt)
        : "La próxima del viernes quedará anotada",
    },
    // Una API anterior a esta tarjeta no trae `database` (undefined): no se muestra.
    ...(database === undefined ? [] : [databaseTile(database)]),
    {
      key: "security",
      icon: ShieldAlert,
      title: "Seguridad",
      status: security.accountsOnAlert > 0 ? "bad" : "ok",
      main: `${plural(security.failedLogins24h, "intento fallido", "intentos fallidos")} (24 h)`,
      detail:
        security.accountsOnAlert > 0
          ? `${plural(security.accountsOnAlert, "cuenta", "cuentas")} con 10 o más en la última hora`
          : "Ninguna cuenta en alerta",
    },
  ];
}

/**
 * «Salud del sistema» (spec 006): emails de hoy, el cupo de Gmail (spec 015), cron, copia de seguridad,
 * lo que ocupa la base de datos frente al tope de Supabase e intentos fallidos de inicio de sesión, cada
 * uno en verde, ámbar o rojo (con ícono y texto), y el resumen arriba. Seis tarjetas: dos filas de tres.
 * `unavailable`: la beta, que no tiene cron, copias ni emails reales.
 */
export function HealthSection({
  health,
  today,
  unavailable = false,
}: {
  health: PlatformStats["health"] | undefined;
  today: ISODate;
  unavailable?: boolean;
}) {
  const list = health && !unavailable ? tiles(health, today) : null;
  const warnings = list?.filter((tile) => tile.status === "warn" || tile.status === "bad").length ?? 0;
  const worst = list?.some((tile) => tile.status === "bad") ? "bad" : warnings > 0 ? "warn" : "ok";
  return (
    <section aria-labelledby="health-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="health-title" className="text-lg font-bold">
          Salud del sistema
        </h2>
        {list && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold",
              worst === "ok" ? "bg-emerald-50 text-emerald-700" : worst === "warn" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700",
            )}
          >
            {worst === "ok" ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
            {worst === "ok" ? "Todo bien" : plural(warnings, "aviso", "avisos")}
          </span>
        )}
      </div>
      {unavailable ? (
        <Card className="px-5 py-4 text-sm text-muted-foreground">No disponible en la beta: no tiene cron, copias de seguridad ni emails reales.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list
            ? list.map((tile) => {
                const status = STATUS[tile.status];
                return (
                  <Card key={tile.key} className={cn("gap-1.5 px-5 py-4", tile.status === "bad" && "ring-2 ring-rose-200", tile.status === "warn" && "ring-2 ring-amber-200")}>
                    <p className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <tile.icon className="size-4" aria-hidden /> {tile.title}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", status.className)}>
                        <status.icon className="size-4" aria-hidden /> {status.label}
                      </span>
                    </p>
                    <p className="text-lg font-bold">{tile.main}</p>
                    {tile.detail && <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{tile.detail}</p>}
                  </Card>
                );
              })
            : Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
        </div>
      )}
      {!unavailable && health?.emailsByDay && <EmailsChart days={health.emailsByDay} />}
    </section>
  );
}
