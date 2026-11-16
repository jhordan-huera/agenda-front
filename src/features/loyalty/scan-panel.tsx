import { AlertTriangle, CameraOff, Check, CircleCheck, ExternalLink, Loader2, RotateCw, ScanQrCode, UserRoundCheck } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useCompleteScan, useLinkScan, useScanQr } from "@/hooks/queries/use-loyalty";
import { readQrToken } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ScanAppointment, ScanResult } from "@/types";
import { createQrDetector, type QrDetector } from "./qr-detector";

/**
 * «Escanear» (spec 052): la cámara lee el QR de la cuenta del paciente (o se pega su enlace). La primera vez en este
 * negocio se elige, entre las citas de hoy que el usuario ve, quién es el paciente, y la cuenta queda unida a esa
 * ficha. Después, sus citas de hoy con «Marcar como atendida». Lo usan el diálogo de la Agenda y de Inicio y la página
 * /dashboard/escanear (a la que lleva /q/:token con `?qr=`).
 */
export function ScanPanel({
  initialToken,
  onReset,
  onNavigate,
}: {
  /** El token que trae la dirección (?qr=): se busca al abrir, sin la cámara. */
  initialToken?: string | null;
  /** «Escanear otro» (la página quita el ?qr=). */
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
      setResult(await scan.mutateAsync(next));
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  // El ?qr= de la dirección, una sola vez (la página cambia de panel si cambia el ?qr=). Mientras tanto, sin la
  // cámara: no se pide permiso para nada.
  const [initial, setInitial] = useState(() => (initialToken ? readQrToken(initialToken) : null));
  const started = useRef(false);
  const lookupInitial = useEffectEvent((value: string) => void lookup(value));
  useEffect(() => {
    if (started.current || !initial) return;
    started.current = true;
    lookupInitial(initial);
  }, [initial]);

  const reset = () => {
    setInitial(null);
    setToken(null);
    setResult(null);
    setError(null);
    onReset?.();
  };

  if (scan.isPending || (initial && token === null && !error)) {
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

/** La primera vez: quién es, entre las citas de hoy. Los del mismo nombre que la cuenta, primero (sin elegirlos solos). */
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
  const agendas = useAgendas();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keyOf = (appointment: ScanAppointment) => `${appointment.id}:${appointment.clientId}`;
  const sameName = (appointment: ScanAppointment) => normalizeSearch(appointment.clientName) === normalizeSearch(result.accountName);
  const rows = [...result.appointments].sort((a, b) => Number(sameName(b)) - Number(sameName(a)));
  const selected = rows.find((appointment) => keyOf(appointment) === chosen) ?? null;

  const submit = async () => {
    if (!selected) return;
    setError(null);
    try {
      const next = await link.mutateAsync({ token, appointmentId: selected.id, clientId: selected.clientId });
      toast.success(`Unimos la cuenta de ${result.accountName} a la ficha de ${selected.clientName}`);
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
          Es la primera vez que escaneas su QR aquí. Elige su cita de hoy: su cuenta queda unida a esa ficha y desde entonces
          ve su tarjeta.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-muted/60 p-3 text-sm">
          No hay citas de hoy que puedas ver. Crea su cita en la Agenda y vuelve a escanear su QR.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Su cita de hoy" className="grid gap-2">
          {rows.map((appointment) => {
            const checked = keyOf(appointment) === chosen;
            return (
              <button
                key={keyOf(appointment)}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setChosen(keyOf(appointment))}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
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
                  <span className="block font-medium">
                    {appointment.startTime} · {appointment.clientName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {appointment.serviceName}
                    {agendas.multiple && ` · ${appointment.professionalName}`}
                    {sameName(appointment) && " · mismo nombre que la cuenta"}
                  </span>
                </span>
                <StatusBadge status={appointment.status} />
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <SubmitButton type="button" loading={link.isPending} loadingText="Uniendo…" disabled={!selected} onClick={submit}>
          <UserRoundCheck /> Unir a esta ficha
        </SubmitButton>
      )}
    </div>
  );
}

/** Ya unida: el paciente y sus citas de hoy, con «Marcar como atendida» en las pendientes y confirmadas. */
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

  const markCompleted = async (appointment: ScanAppointment) => {
    setError(null);
    try {
      const next = await complete.mutateAsync({ token, appointmentId: appointment.id });
      toast.success(`Cita de ${result.clientName.split(" ")[0]} marcada como atendida`);
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

      {result.appointments.length === 0 ? (
        <p className="rounded-lg bg-muted/60 p-3 text-sm">
          <span className="font-medium">No tiene cita hoy.</span> Crea su cita en la Agenda y márcala como atendida para que sume.
        </p>
      ) : (
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
                <p className="text-xs text-muted-foreground">
                  {appointment.status === "completed" ? "Ya está atendida." : "Esta cita ya no se puede marcar como atendida."}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
