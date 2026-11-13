import type { EmailNotification } from "@/types";

/** El estado de un email en /admin → Actividad (spec 049): sólo el que falló va en rojo. */
export type EmailStatusKey = "sent" | "queued" | "failed" | "discarded";

export interface EmailStatus {
  key: EmailStatusKey;
  label: string;
  /** El motivo, debajo del asunto: por qué falló o por qué no salió a propósito. */
  detail: string | null;
}

export function emailStatusOf(email: Pick<EmailNotification, "status" | "error" | "discarded">): EmailStatus {
  if (email.status === "sent") return { key: "sent", label: "Enviado", detail: null };
  if (email.status === "queued") return { key: "queued", label: "En cola", detail: null };
  const reason = email.error?.trim() || null;
  if (email.discarded) return { key: "discarded", label: "Descartado", detail: reason ?? "No salió a propósito." };
  return { key: "failed", label: "Falló", detail: reason ?? "Sin motivo registrado." };
}
