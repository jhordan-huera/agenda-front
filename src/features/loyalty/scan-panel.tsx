import { AlertTriangle, CameraOff, Check, CircleCheck, ExternalLink, Loader2, RotateCw, ScanQrCode, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/use-permissions";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useCompleteScan, useLinkScan, useScanNewClient, useScanQr } from "@/hooks/queries/use-loyalty";
import { readQrToken } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { ScanAppointment, ScanResult } from "@/types";
import { createQrDetector, type QrDetector } from "./qr-detector";

/**
 * «Escanear» (spec 052): la cámara lee el QR de la cuenta del paciente (o se pega su enlace). La primera vez en este
 * negocio se elige quién es (la ficha con su mismo teléfono, la de una cita de hoy o una ficha nueva) y la cuenta
 * queda unida a esa ficha. Al escanear, su cita de hoy queda atendida sola si es la única pendiente o confirmada, de
 * un solo paciente y desde una hora antes de su inicio (decisiones del dueño); las demás, con «Marcar como atendida».
 * Lo usan el diálogo de la Agenda y de Inicio y la página /dashboard/escanear (a la que lleva /q/:token con `?qr=`,
 * p. ej. al leer el QR con la cámara del celular). Un QR que llega como enlace no se escanea solo: alguien del equipo
 * confirma que el paciente está ahí (revisión de seguridad: si no, bastaba mandar el enlace por WhatsApp).
 */
export function ScanPanel({
  initialToken,
  onReset,
  onNavigate,
}: {
  /** El token que trajo la dirección (?qr=): se busca después de confirmar que el paciente está ahí, sin la cámara. */
  initialToken?: string | null;
  /** «Escanear otro» o «Usar la cámara» (la página olvida el token del enlace). */
  onReset?: () => void;
  /** Al ir a la ficha (el diálogo se cierra). */
  onNavigate?: () => void;
}) {
  const scan = useScanQr();
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(() =>
    initialToken && !readQrToken(initialToken) ? "Este enlace no es el QR de una tarjeta de paciente." : null,
  );

  const lookup = async (next: string) => {
    setToken(next);
    setResult(null);
    setError(null);
    try {
      const found = await scan.mutateAsync(next);
      completedToast(found, false);
      setResult(found);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  // El token del enlace (?qr=): espera el toque «El paciente está aquí». Mientras tanto, sin la cámara: no se pide
  // permiso para nada.
  const [initial, setInitial] = useState(() => (initialToken ? readQrToken(initialToken) : null));

  const reset = () => {
    setInitial(null);
    setToken(null);
    setResult(null);
    setError(null);
    onReset?.();
  };

  if (initial && token === null && !error && !scan.isPending) {
    return <ConfirmLinkScan onConfirm={() => void lookup(initial)} onCancel={reset} />;
  }

  if (scan.isPending) {
    return (
      <div className="space-y-3" role="status" aria-label="Buscando al paciente">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p>{error}</p>
        </div>
        <Button onClick={reset}>
          <ScanQrCode /> Escanear otro
        </Button>
      </div>
    );
  }

  if (token && result) {
    return (
      <div className="space-y-4">
        {result.status === "unlinked" ? (
          <ChoosePatient token={token} result={result} onLinked={setResult} />
        ) : (
          <LinkedPatient token={token} result={result} onChange={setResult} onNavigate={onNavigate} />
        )}
        <Button variant="outline" onClick={reset}>
          <ScanQrCode /> Escanear otro
        </Button>
      </div>
    );
  }

  return <QrReader onToken={(found) => void lookup(found)} />;
}

/**
 * Un QR que llegó como enlace (la cámara del celular o un mensaje): se escanea sólo si el paciente está ahí. Escanear
 * puede unir su cuenta y dejar su cita atendida.
 */
function ConfirmLinkScan({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
        <ScanQrCode className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Abriste el QR de un paciente desde un enlace</p>
          <p className="text-muted-foreground">
            Escanéalo sólo si el paciente está frente a ti: puede unir su cuenta a su ficha y dejar su cita de hoy atendida.
            No abras QR que te manden por mensaje.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onConfirm}>
          <UserRoundCheck /> El paciente está aquí: escanear
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Usar la cámara
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Leer el QR -- */

type CameraState = { kind: "starting" } | { kind: "scanning" } | { kind: "error"; message: string };

const READER_ERROR = "Este navegador no puede leer el QR. Pega el enlace aquí abajo o ábrelo con la cámara del celular.";

function cameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "No tenemos permiso para usar la cámara. Permítelo en tu navegador o pega el enlace del QR aquí abajo.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No encontramos una cámara en este equipo. Pega el enlace del QR aquí abajo.";
  if (name === "NotReadableError") return "Otra aplicación está usando la cámara. Ciérrala y vuelve a intentarlo.";
  return "No pudimos abrir la cámara. Vuelve a intentarlo o pega el enlace del QR aquí abajo.";
}

function QrReader({ onToken }: { onToken: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onTokenRef = useRef(onToken);
  const [camera, setCamera] = useState<CameraState>({ kind: "starting" });
  const [attempt, setAttempt] = useState(0);
  const [wrongQr, setWrongQr] = useState(false);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const start = async () => {
      // La cámara sólo se presta en una página segura (https o este mismo equipo): p. ej., no en http://192.168…
      if (!window.isSecureContext) {
        setCamera({
          kind: "error",
          message: "La cámara sólo funciona en una página segura (https). Lee el QR con la cámara del celular o pega su enlace aquí abajo.",
        });
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera({ kind: "error", message: "Este navegador no deja usar la cámara aquí. Pega el enlace del QR aquí abajo." });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (error) {
        if (!stopped) setCamera({ kind: "error", message: cameraError(error) });
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) {
        stop();
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      let detector: QrDetector;
      try {
        detector = await createQrDetector();
      } catch {
        if (!stopped) {
          stop();
          setCamera({ kind: "error", message: READER_ERROR });
        }
        return;
      }
      if (stopped) return;
      setCamera({ kind: "scanning" });
      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= 2) {
          try {
            const codes = await detector.detect(video);
            const found = codes.map((code) => readQrToken(code.rawValue)).find((value) => value !== null);
            if (found && !stopped) {
              stop();
              onTokenRef.current(found);
              return;
            }
            if (codes.length > 0) setWrongQr(true);
          } catch (error) {
            // Sin el lector (el navegador no lo permite): se dice, en vez de quedarse mirando.
            if (error instanceof DOMException && error.name === "NotSupportedError") {
              stop();
              setCamera({ kind: "error", message: READER_ERROR });
              return;
            }
            // Un cuadro que no se pudo leer: sigue con el siguiente.
          }
        }
        if (!stopped) timer = setTimeout(() => void tick(), 250);
      };
      void tick();
    };

    void start();
    return stop;
  }, [attempt]);

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    const found = readQrToken(manual);
    if (!found) {
      setManualError("Eso no es el QR de una tarjeta de paciente. Pega el enlace completo (termina en /q/ y el código).");
      return;
    }
    onToken(found);
  };

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-muted">
        <video ref={videoRef} className="size-full object-cover" playsInline muted autoPlay aria-label="Cámara para escanear el QR" />
        {camera.kind === "scanning" && (
          <span aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-primary-foreground/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.25)]" />
        )}
        {camera.kind === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Abriendo la cámara…
          </div>
        )}
        {camera.kind === "error" && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm">
            <CameraOff className="size-6 text-muted-foreground" aria-hidden />
            <p>{camera.message}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCamera({ kind: "starting" });
                setAttempt((current) => current + 1);
              }}
            >
              <RotateCw /> Volver a intentar
            </Button>
          </div>
        )}
      </div>
      <p className="min-h-5 text-center text-sm text-muted-foreground" role="status">
        {camera.kind === "scanning" &&
          (wrongQr ? "Ese QR no es de una tarjeta de paciente. Pídele que abra «Mi tarjeta»." : "Apunta la cámara al QR de la tarjeta del paciente.")}
      </p>

      <form onSubmit={submitManual} noValidate className="grid gap-2 border-t pt-4">
        <FormField
          label="O pega el enlace del QR"
          error={manualError ?? undefined}
          hint="El enlace que se abre al escanearlo con la cámara del celular (…/q/…)."
        >
          {(field) => (
            <div className="flex gap-2">
              <Input
                {...field}
                value={manual}
                autoComplete="off"
                spellCheck={false}
                placeholder="https://…/q/…"
                onChange={(event) => {
                  setManual(event.target.value);
                  setManualError(null);
                }}
              />
              <SubmitButton variant="outline" className="shrink-0">
                Buscar
              </SubmitButton>
            </div>
          )}
        </FormField>
      </form>
    </div>
  );
}

/* --------------------------------------------------------- Lo que encontró -- */

const isOpen = (appointment: ScanAppointment) => appointment.status === "pending" || appointment.status === "confirmed";
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** El aviso de la cita que el escaneo acaba de marcar como atendida (pedido del dueño). */
function completedToast(result: ScanResult, linkedNow: boolean) {
  if (result.status !== "linked") return;
  const name = firstName(result.clientName);
  if (result.completedNow) {
    toast.success(linkedNow ? `Unimos la cuenta de ${name} y su cita de hoy quedó atendida` : `La cita de hoy de ${name} quedó atendida`, {
      description: `${result.completedNow.startTime} · ${result.completedNow.serviceName}`,
    });
  } else if (linkedNow) {
    toast.success(`Unimos la cuenta a la ficha de ${result.clientName}`);
  }
}

/** Una fila para elegir (una ficha o una cita de hoy). */
function ChoiceRow({
  checked,
  disabled,
  onSelect,
  title,
  detail,
  badge,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
        checked && "border-primary bg-accent hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        )}
        aria-hidden
      >
        {checked && <Check className="size-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      {badge}
    </button>
  );
}

/**
 * La primera vez: quién es. Primero la ficha con el mismo teléfono que la cuenta (sin cita; se comprueba con el final
 * de su cédula), después las citas de hoy (otra persona u otro teléfono) y «Paciente nuevo». El nombre de la cuenta lo
 * escribe quien la creó: no elige solo (revisión de seguridad de la spec 052). Al unir, su cita de hoy queda atendida.
 */
function ChoosePatient({
  token,
  result,
  onLinked,
}: {
  token: string;
  result: Extract<ScanResult, { status: "unlinked" }>;
  onLinked: (result: ScanResult) => void;
}) {
  const link = useLinkScan();
  const newClient = useScanNewClient();
  const agendas = useAgendas();
  const { can } = usePermissions();
  const [chosen, setChosen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byPhone = new Set(result.phoneClients.map((client) => client.clientId));
  const keyOf = (appointment: ScanAppointment) => `a:${appointment.id}:${appointment.clientId}`;
  // Las citas de las fichas que ya salen por el teléfono no se repiten.
  const rows = result.appointments
    .filter((appointment) => !byPhone.has(appointment.clientId))
    .sort((a, b) => Number(b.phoneMatches) - Number(a.phoneMatches));
  const chosenClient = result.phoneClients.find((client) => `c:${client.clientId}` === chosen) ?? null;
  const chosenAppointment = rows.find((appointment) => keyOf(appointment) === chosen) ?? null;
  const nothing = result.phoneClients.length === 0 && rows.length === 0;

  const submit = async () => {
    const input = chosenClient
      ? { token, appointmentId: null, clientId: chosenClient.clientId }
      : chosenAppointment
        ? { token, appointmentId: chosenAppointment.id, clientId: chosenAppointment.clientId }
        : null;
    if (!input) return;
    setError(null);
    try {
      const next = await link.mutateAsync(input);
      completedToast(next, true);
      onLinked(next);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">¿Quién es {result.accountName}?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Es la primera vez que escaneas su QR aquí. Su cuenta es del teléfono terminado en {result.accountPhoneEnd}. Elige su
          ficha: su cuenta queda unida y, si ya es la hora de su cita de hoy, queda atendida.
        </p>
      </div>

      {result.phoneClients.length > 0 && (
        <section className="space-y-2" aria-labelledby="scan-by-phone">
          <h4 id="scan-by-phone" className="text-sm font-medium">
            Ficha con su mismo teléfono
          </h4>
          <div role="radiogroup" aria-labelledby="scan-by-phone" className="grid gap-2">
            {result.phoneClients.map((client) => (
              <ChoiceRow
                key={client.clientId}
                checked={chosen === `c:${client.clientId}`}
                disabled={client.linkedToOther || !client.isActive}
                onSelect={() => setChosen(`c:${client.clientId}`)}
                title={client.clientName}
                detail={
                  client.linkedToOther
                    ? "Ya está unida a otra cuenta"
                    : !client.isActive
                      ? "Ficha inactiva: actívala en Clientes para unirla"
                      : client.documentEnd
                      ? `Cédula terminada en ${client.documentEnd}: compruébala con el paciente`
                      : "Sin cédula: comprueba con el paciente que es él o ella"
                }
              />
            ))}
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section className="space-y-2" aria-labelledby="scan-today">
          <h4 id="scan-today" className="text-sm font-medium">
            {result.phoneClients.length > 0 ? "¿Es otra persona? Su cita de hoy" : "Su cita de hoy"}
          </h4>
          <div role="radiogroup" aria-labelledby="scan-today" className="grid gap-2">
            {rows.map((appointment) => (
              <ChoiceRow
                key={keyOf(appointment)}
                checked={chosen === keyOf(appointment)}
                onSelect={() => setChosen(keyOf(appointment))}
                title={`${appointment.startTime} · ${appointment.clientName}`}
                detail={`${appointment.serviceName}${agendas.multiple ? ` · ${appointment.professionalName}` : ""}${
                  appointment.phoneMatches ? " · mismo teléfono que la cuenta" : " · otro teléfono"
                }`}
                badge={<StatusBadge status={appointment.status} />}
              />
            ))}
          </div>
        </section>
      )}

      {nothing && (
        <p className="rounded-lg bg-muted/60 p-3 text-sm">No hay una ficha con su teléfono ni citas de hoy que puedas ver.</p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {!nothing && (
        <SubmitButton type="button" loading={link.isPending} loadingText="Uniendo…" disabled={!chosenClient && !chosenAppointment} onClick={submit}>
          <UserRoundCheck />
          {chosenAppointment?.completesOnScan ? "Unir y marcar como atendida" : "Unir a esta ficha"}
        </SubmitButton>
      )}

      {can("clients.manage") && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {result.phoneClients.length > 0
              ? "Ya hay una ficha con su teléfono: crea otra sólo si es otra persona (por ejemplo, un familiar)."
              : "¿Todavía no tiene ficha en tu consultorio?"}
          </p>
          <Button variant="outline" onClick={() => setCreating(true)}>
            <UserRoundPlus /> Paciente nuevo: crear su ficha
          </Button>
          <p className="text-xs text-muted-foreground">
            ¿Ya tiene ficha con otro teléfono? Pon en su ficha el de su cuenta (terminado en {result.accountPhoneEnd}) y vuelve a
            escanear su QR: no le crees otra.
          </p>
        </div>
      )}
      <ClientFormDialog
        open={creating}
        onOpenChange={setCreating}
        defaultName={result.accountName}
        custom={{
          title: "Paciente nuevo",
          description: "Creamos su ficha con el teléfono de su cuenta y la unimos. Comprueba su nombre y su cédula con el paciente.",
          submitLabel: "Crear ficha y unir",
          lockedPhone: `Terminado en ${result.accountPhoneEnd}`,
          onSubmit: async (client) => {
            const next = await newClient.mutateAsync({ token, client });
            completedToast(next, true);
            onLinked(next);
          },
        }}
      />
    </div>
  );
}

/**
 * Ya unida: el paciente y sus citas de hoy. Su única cita por atender ya quedó atendida al escanear (`completedNow`);
 * con varias, «Marcar como atendida» en la que corresponda.
 */
function LinkedPatient({
  token,
  result,
  onChange,
  onNavigate,
}: {
  token: string;
  result: Extract<ScanResult, { status: "linked" }>;
  onChange: (result: ScanResult) => void;
  onNavigate?: () => void;
}) {
  const complete = useCompleteScan();
  const agendas = useAgendas();
  const [error, setError] = useState<string | null>(null);
  const open = result.appointments.filter(isOpen);

  const markCompleted = async (appointment: ScanAppointment) => {
    setError(null);
    try {
      const next = await complete.mutateAsync({ token, appointmentId: appointment.id });
      completedToast(next, false);
      onChange(next);
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar name={result.clientName} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{result.clientName}</h3>
          <p className="text-sm text-muted-foreground">Su cuenta está unida a su ficha.</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to={`/dashboard/clients/${result.clientId}`} onClick={onNavigate} aria-label={`Ver la ficha de ${result.clientName}`}>
            <ExternalLink /> Ver ficha
          </Link>
        </Button>
      </div>

      {result.completedNow && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-primary/30 bg-accent p-3 text-sm">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-medium">
              Su cita de hoy quedó atendida: {result.completedNow.startTime} · {result.completedNow.serviceName}.
            </span>{" "}
            <span className="text-muted-foreground">
              Si no correspondía, el propietario puede corregirla desde la cita («Corregir estado»).
            </span>
          </p>
        </div>
      )}

      {result.appointments.length === 0 ? (
        <p className="rounded-lg bg-muted/60 p-3 text-sm">
          <span className="font-medium">No tiene cita hoy.</span> Crea su cita en la Agenda y vuelve a escanear su QR para que
          quede atendida.
        </p>
      ) : (
        <>
          {open.length > 1 && <p className="text-sm text-muted-foreground">Tiene {open.length} citas hoy por atender: marca la que corresponde.</p>}
          <ul className="space-y-2" aria-label="Sus citas de hoy">
            {result.appointments.map((appointment) => (
              <li key={appointment.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      Hoy {appointment.startTime} · {appointment.serviceName}
                    </p>
                    {agendas.multiple && <p className="text-xs text-muted-foreground">Con {appointment.professionalName}</p>}
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
                {isOpen(appointment) && !appointment.completesOnScan && (
                  <p className="text-xs text-muted-foreground">
                    {appointment.withOthers
                      ? "Es una sesión con varios pacientes: márcala cuando termine (queda atendida para todos)."
                      : `Empieza a las ${appointment.startTime}: márcala cuando sea su hora.`}
                  </p>
                )}
                {isOpen(appointment) ? (
                  <SubmitButton
                    type="button"
                    className="w-full sm:w-auto"
                    loading={complete.isPending && complete.variables?.appointmentId === appointment.id}
                    loadingText="Marcando…"
                    disabled={complete.isPending}
                    onClick={() => markCompleted(appointment)}
                  >
                    <CircleCheck /> Marcar como atendida
                  </SubmitButton>
                ) : (
                  appointment.status !== "completed" && (
                    <p className="text-xs text-muted-foreground">Esta cita ya no se puede marcar como atendida.</p>
                  )
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
