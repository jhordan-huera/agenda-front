import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PatientAccount } from "@/types";
import { dayOf } from "./patient-card-text";

/** El último aviso que el paciente cerró en este aparato (la fecha del cambio): otro cambio lo vuelve a mostrar. */
const DISMISSED_KEY = "agenda360:aviso-contrasena-paciente";

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/**
 * «Tu contraseña se cambió con un enlace de [negocio]» (spec 052, Historia 6): si alguien del consultorio generó el
 * enlace y entró, el paciente lo ve. Discreto y con «Entendido», que lo cierra sólo en este aparato.
 */
export function PasswordResetNotice({ reset }: { reset: PatientAccount["passwordReset"] }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!reset || dismissed === reset.at) return null;

  const dismiss = () => {
    setDismissed(reset.at);
    try {
      localStorage.setItem(DISMISSED_KEY, reset.at);
    } catch {
      // Sin almacenamiento: se cierra hasta recargar.
    }
  };

  return (
    <div className="mb-4 flex gap-3 rounded-xl border bg-card px-3.5 py-3 text-sm">
      <KeyRound className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>
          Tu contraseña se cambió con un enlace de {reset.businessName} el {dayOf(reset.at)}. Si no fuiste tú, avísale a tu
          consultorio.
        </p>
        {/* La zona para el dedo crece hasta 44 px sin mover el texto. */}
        <Button
          variant="link"
          className="relative mt-1 h-auto p-0 text-sm before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']"
          onClick={dismiss}
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
