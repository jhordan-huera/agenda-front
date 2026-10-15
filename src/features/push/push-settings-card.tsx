import { BellOff, BellRing, Loader2, Send, Smartphone, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IosInstallDialog } from "@/features/install/install-app";
import { SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { PUSH_KIND_LABELS, type MutablePushKind } from "@/lib/constants/push";
import { getErrorMessage } from "@/lib/data";
import type { PushKind } from "@/types";
import type { PushAudience } from "./push-prompt";
import { browserFamily, deviceLabel, type BrowserFamily } from "./push-support";
import { usePushDevice } from "./use-push-device";

const DESCRIPTION: Record<PushAudience, string> = {
  owner:
    "Te avisamos al momento de las reservas, los comprobantes y las cancelaciones, y de las citas que quedan sin cerrar. Sólo llevan el nombre abreviado del paciente («Juan P.»).",
  platform: "Negocios nuevos, solicitudes de cambio de plan y alertas de seguridad, además de los avisos por ntfy.",
};

/** Cómo volver a permitir los avisos, en el navegador de esta persona. */
const UNBLOCK_STEPS: Record<BrowserFamily, string> = {
  chrome: "Toca el candado (o el icono de ajustes) junto a la dirección de la página → Notificaciones → Permitir, y recarga la página.",
  firefox: "Toca el candado junto a la dirección de la página, quita «Bloqueado» en «Enviar notificaciones» y recarga la página.",
  safari: "En Safari → Ajustes → Sitios web → Notificaciones, elige «Permitir» para este sitio y recarga la página.",
  iphone: "Abre Ajustes → Notificaciones → Agenda360, activa «Permitir notificaciones» y vuelve a abrir la app.",
};

/**
 * «Avisos en este celular» (spec 013, RF-001 y RF-003): activar o desactivar en este aparato, el aviso
 * de prueba y un interruptor por tipo (todos vienen encendidos y cada uno se guarda al momento). Explica
 * qué hacer en el iPhone sin la app instalada y con el permiso bloqueado. Una columna a 390 px.
 */
export function PushSettingsCard({ audience, icon }: { audience: PushAudience; icon?: LucideIcon }) {
  const push = usePushDevice(true);
  const [iosSteps, setIosSteps] = useState(false);
  const [saved, setSaved] = useState("");
  if (push.status === "hidden") return null;
  if (push.status === "loading") return <SettingsSectionSkeleton fields={1} />;
  const { here, noun } = deviceLabel();
  const busy = push.activate.isPending || push.deactivate.isPending;

  const turnOn = () =>
    push.activate.mutate(undefined, {
      onSuccess: ({ tested }) => {
        setSaved(`Avisos activados ${here}.`);
        toast.success("Avisos activados", {
          description: tested ? "Te mandamos un aviso de prueba." : "No pudimos mandar el aviso de prueba, pero quedaron activados.",
        });
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  const turnOff = () =>
    push.deactivate.mutate(undefined, {
      onSuccess: () => {
        setSaved(`Avisos desactivados ${here}.`);
        toast.success(`Avisos desactivados ${here}`);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  const test = () =>
    push.sendTest.mutate(undefined, {
      onSuccess: () => toast.success("Aviso de prueba enviado", { description: `Debería llegarte ${here} en unos segundos.` }),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  const toggle = (kind: PushKind, on: boolean) =>
    push.setKind.mutate(
      { kind, on },
      {
        onSuccess: () => setSaved(`Guardado: ${PUSH_KIND_LABELS[kind as MutablePushKind].label} ${on ? "encendido" : "apagado"}.`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {icon && <CardTitleIcon icon={icon} />}
          Avisos {here}
          {push.status === "on" ? (
            <Badge className="bg-emerald-100 text-emerald-800">Activados</Badge>
          ) : (
            push.status === "off" && <Badge variant="outline">Desactivados</Badge>
          )}
        </CardTitle>
        <CardDescription>{DESCRIPTION[audience]}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {push.status === "error" && (
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">No pudimos revisar los avisos de este aparato.</p>
            <Button variant="outline" size="sm" onClick={push.retry}>
              Reintentar
            </Button>
          </div>
        )}
        {push.status === "unavailable" && <Notice>Los avisos en el celular todavía no están disponibles.</Notice>}
        {push.status === "dev" && (
          <Notice>
            Los avisos se prueban con la versión compilada (<code>npm run build</code> y <code>npm run preview</code>): en{" "}
            <code>npm run dev</code> no hay service worker.
          </Notice>
        )}
        {push.status === "ios-install" && (
          <div className="grid gap-3">
            <Notice icon={Smartphone}>
              En el iPhone los avisos sólo llegan con la app instalada en la pantalla de inicio (iOS 16.4 o más reciente). Instálala
              y actívalos desde ahí.
            </Notice>
            <Button variant="outline" className="w-full sm:w-fit" onClick={() => setIosSteps(true)}>
              <Smartphone /> Cómo instalarla
            </Button>
            <IosInstallDialog open={iosSteps} onOpenChange={setIosSteps} />
          </div>
        )}
        {push.status === "ios-old" && <Notice>Tu iPhone necesita iOS 16.4 o más reciente para recibir avisos.</Notice>}
        {push.status === "unsupported" && <Notice>Este navegador no permite avisos. Ábrela en Chrome, Safari, Edge o Firefox.</Notice>}
        {push.status === "denied" && (
          <div className="grid gap-1.5 rounded-lg border border-amber-600/25 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Bloqueaste los avisos en este navegador</p>
            <p>{UNBLOCK_STEPS[browserFamily()]}</p>
          </div>
        )}
        {push.status === "off" && (
          <Button className="w-full sm:w-fit" onClick={turnOn} disabled={busy}>
            {push.activate.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing />} Activar los avisos
          </Button>
        )}
        {push.status === "on" && (
          <>
            <p className="text-sm">
              Activados {here}. Cada {noun} se activa por separado; los avisos llegan a todos los que tengas activados.
            </p>
            <div className="grid gap-2" role="group" aria-label="Qué avisos quieres">
              {push.kinds.map((kind) => {
                const label = PUSH_KIND_LABELS[kind as MutablePushKind];
                if (!label) return null;
                return (
                  <SwitchField
                    key={kind}
                    label={label.label}
                    description={label.description}
                    checked={!push.device?.mutedKinds.includes(kind)}
                    onCheckedChange={(on) => toggle(kind, on)}
                  />
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button variant="outline" onClick={test} disabled={push.sendTest.isPending || busy}>
                {push.sendTest.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send />} Enviar un aviso de prueba
              </Button>
              <Button variant="ghost" onClick={turnOff} disabled={busy}>
                {push.deactivate.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <BellOff />} Desactivar {here}
              </Button>
            </div>
          </>
        )}
        {/* El estado y cada interruptor guardado, para el lector de pantalla (y «Guardado» a la vista). */}
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground empty:hidden">
          {saved}
        </p>
      </CardContent>
    </Card>
  );
}

function Notice({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
