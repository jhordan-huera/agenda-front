import { formatCount, plural } from "@/lib/format";
import type { AdminEmailFilter } from "@/types";
import type { ActivityTab } from "./activity-url";

/** Las cifras de hoy que ya manda el Inicio del super admin (`stats.health`). */
export interface TodayHealth {
  emailsToday: { sent: number; failed: number; queued: number };
  security: { failedLogins24h: number; accountsOnAlert: number };
}

/** «ok»: nada que mirar. «alert»: emails fallidos hoy o cuentas en alerta. */
export type SummaryTone = "ok" | "alert";

/** Un trozo de la frase; `link`: el que lleva a Seguridad (los intentos fallidos). */
export interface SummaryPiece {
  text: string;
  link?: true;
}

/** El botón del resumen: a qué pestaña lleva y con qué filtro. */
export interface SummaryAction {
  label: string;
  tab: ActivityTab;
  emailFilter?: AdminEmailFilter;
  onlyFailed?: boolean;
}

export interface TodaySummary {
  tone: SummaryTone;
  title: string;
  action: SummaryAction | null;
  /** «Salieron 46 emails y 3 están en cola; ninguno falló.» */
  emails: string;
  /** «En las últimas 24 horas hubo [2 intentos fallidos] de inicio de sesión y ninguna cuenta está en alerta.» */
  security: SummaryPiece[];
}

/** La cifra de una pestaña, con lo que dice para un lector de pantalla. */
export interface TabBadge {
  label: string;
  /** Sólo la cifra, para el celular. */
  count: number;
  srLabel: string;
  tone: SummaryTone;
}

/** El resumen de arriba de /admin → Actividad (spec 049), en lugar de las cuatro tarjetas de cifras. */
export function summarizeToday({ emailsToday, security }: TodayHealth): TodaySummary {
  const { sent, failed, queued } = emailsToday;
  const { failedLogins24h: attempts, accountsOnAlert: alerts } = security;

  const failedTitle = failed === 0 ? null : failed === 1 ? "1 email falló hoy" : `${formatCount(failed)} emails fallaron hoy`;
  const alertTitle = alerts === 0 ? null : plural(alerts, "cuenta en alerta", "cuentas en alerta");
  const title = failedTitle && alertTitle ? `${failedTitle} y ${alertTitle}` : (failedTitle ?? alertTitle ?? "Todo en orden hoy");

  const sentText = sent === 0 ? "Todavía no salió ningún email" : sent === 1 ? "Salió 1 email" : `Salieron ${formatCount(sent)} emails`;
  const queuedText = queued === 0 ? "" : queued === 1 ? " y 1 está en cola" : ` y ${formatCount(queued)} están en cola`;
  // «ninguno falló» sólo cuando ya salió alguno; con fallidos, el título ya lo dice.
  const emails = `${sentText}${queuedText}${failed > 0 || sent === 0 ? "." : "; ninguno falló."}`;

  const securityPieces: SummaryPiece[] =
    attempts === 0
      ? [{ text: "En las últimas 24 horas no hubo intentos fallidos de inicio de sesión" }]
      : [
          { text: "En las últimas 24 horas hubo " },
          { text: plural(attempts, "intento fallido", "intentos fallidos"), link: true },
          { text: " de inicio de sesión" },
        ];
  securityPieces.push({
    text: alerts === 0 ? " y ninguna cuenta está en alerta." : alerts === 1 ? "; 1 cuenta está en alerta." : `; ${alerts} cuentas están en alerta.`,
  });

  const action: SummaryAction | null =
    failed > 0
      ? { label: "Ver los fallidos", tab: "emails", emailFilter: "failed" }
      : alerts > 0
        ? { label: "Ver la seguridad", tab: "security", onlyFailed: true }
        : null;

  return { tone: failedTitle || alertTitle ? "alert" : "ok", title, action, emails, security: securityPieces };
}

/** Las cifras de las pestañas: Seguridad, los intentos fallidos de 24 h; Emails, los fallidos de hoy o los en cola. */
export function tabBadges({ emailsToday, security }: TodayHealth): { security: TabBadge | null; emails: TabBadge | null } {
  const attempts = security.failedLogins24h;
  return {
    security:
      attempts > 0
        ? {
            label: formatCount(attempts),
            count: attempts,
            srLabel: `${plural(attempts, "intento fallido", "intentos fallidos")} en las últimas 24 horas`,
            tone: security.accountsOnAlert > 0 ? "alert" : "ok",
          }
        : null,
    emails:
      emailsToday.failed > 0
        ? {
            label: plural(emailsToday.failed, "fallido", "fallidos"),
            count: emailsToday.failed,
            srLabel: `${plural(emailsToday.failed, "email fallido", "emails fallidos")} hoy`,
            tone: "alert",
          }
        : emailsToday.queued > 0
          ? {
              label: `${formatCount(emailsToday.queued)} en cola`,
              count: emailsToday.queued,
              srLabel: `${plural(emailsToday.queued, "email", "emails")} en cola`,
              tone: "ok",
            }
          : null,
  };
}
