import { BellRing, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/use-session";
import { getErrorMessage } from "@/lib/data";
import { deviceLabel, isSnoozed, snooze, wasTurnedOff } from "./push-support";
import { usePushDevice } from "./use-push-device";

/** De quién son los avisos: el propietario del negocio o el super admin. */
export type PushAudience = "owner" | "platform";

const WHAT: Record<PushAudience, string> = {
  owner: "Te avisamos al momento de las reservas, los comprobantes y las cancelaciones.",
  platform: "Te avisamos al momento de los negocios nuevos, las solicitudes de plan y las alertas de seguridad.",
};

/**
 * La franja «Activa los avisos en este celular» al entrar al panel (spec 013, RF-001b). Siempre se
 * monta en el layout (así sincroniza en silencio este aparato) y sólo se ve si se pueden activar, no
 * están activados, nadie eligió «Ahora no» en los últimos 7 días y esta persona no los desactivó aquí.
 */
export function PushPrompt({ audience }: { audience: PushAudience }) {
  const { session } = useSession();
  const push = usePushDevice(true);
  const [dismissed, setDismissed] = useState(isSnoozed);
  if (push.status !== "off" || dismissed || !session || wasTurnedOff(session.userId)) return null;
  const { here } = deviceLabel();

  const turnOn = () =>
    push.activate.mutate(undefined, {
      onSuccess: ({ tested }) =>
        toast.success("Avisos activados", {
          description: tested ? "Te mandamos un aviso de prueba." : "No pudimos mandar el aviso de prueba, pero quedaron activados.",
        }),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  const later = () => {
    snooze();
    setDismissed(true);
  };

  return (
    <section
      aria-label="Activar los avisos"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-primary/15 bg-accent px-4 py-2.5 text-sm text-accent-foreground sm:px-6 lg:px-8"
    >
      <p className="flex min-w-0 flex-1 items-start gap-2">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="min-w-0">
          <strong className="font-semibold">Activa los avisos {here}</strong>
          <span className="text-foreground/80"> · {WHAT[audience]}</span>
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={turnOn} disabled={push.activate.isPending}>
          {push.activate.isPending && <Loader2 className="animate-spin" aria-hidden />}
          Activar
        </Button>
        <Button size="sm" variant="ghost" onClick={later} disabled={push.activate.isPending}>
          Ahora no
        </Button>
      </div>
    </section>
  );
}
