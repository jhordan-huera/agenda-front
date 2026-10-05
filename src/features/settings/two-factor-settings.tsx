import { Check, Copy, Download, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useRegenerateRecoveryCodes,
  useTwoFactorSetup,
  useTwoFactorStatus,
} from "@/hooks/queries/use-two-factor";
import { getErrorMessage } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { twoFactorConfirmSchema, twoFactorDisableSchema, twoFactorEnableSchema } from "@/lib/validations/auth";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import { SettingsSectionSkeleton } from "./settings-section";

/** Con pocos códigos de recuperación conviene generar otros. */
const FEW_RECOVERY_CODES = 3;

/**
 * Verificación en dos pasos de la cuenta de super admin: además de la contraseña, el código
 * de 6 dígitos de una app de autenticación del celular.
 */
export function TwoFactorSettings() {
  const status = useTwoFactorStatus();
  const [dialog, setDialog] = useState<"enable" | "disable" | "codes" | null>(null);
  const close = () => setDialog(null);

  if (status.isPending) return <SettingsSectionSkeleton fields={1} />;
  if (status.isError) return <ErrorState onRetry={() => status.refetch()} />;
  const { enabled, enabledAt, recoveryCodesLeft } = status.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Verificación en dos pasos
          {enabled ? (
            <Badge className="bg-emerald-100 text-emerald-800">Activada</Badge>
          ) : (
            <Badge variant="destructive">Desactivada</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Además de la contraseña, al iniciar sesión se pide el código de 6 dígitos de una app de tu celular (Google
          Authenticator, Microsoft Authenticator…). Aunque alguien consiga tu contraseña, no podrá entrar.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {enabled ? (
          <>
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {enabledAt && <li>Activada desde el {formatDateTime(enabledAt)}</li>}
              <li className={recoveryCodesLeft <= FEW_RECOVERY_CODES ? "font-medium text-destructive" : undefined}>
                {recoveryCodesLeft === 1 ? "Te queda 1 código" : `Te quedan ${recoveryCodesLeft} códigos`} de recuperación
                sin usar.
                {recoveryCodesLeft <= FEW_RECOVERY_CODES && " Genera códigos nuevos."}
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setDialog("codes")}>
                <KeyRound /> Generar códigos de recuperación nuevos
              </Button>
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDialog("disable")}>
                <ShieldOff /> Desactivar
              </Button>
            </div>
          </>
        ) : (
          <div>
            <Button onClick={() => setDialog("enable")}>
              <ShieldCheck /> Activar
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && close()}>
        {/* Sólo se cierra con sus botones: un clic fuera o Escape no deben perder los códigos de recuperación. */}
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          {dialog === "enable" && <EnableFlow onDone={close} />}
          {dialog === "codes" && <RegenerateFlow onDone={close} />}
          {dialog === "disable" && <DisableForm onDone={close} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* --------------------------------------------------------------- Activar -- */

function EnableFlow({ onDone }: { onDone: () => void }) {
  const setup = useTwoFactorSetup();
  const enable = useEnableTwoFactor();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const { mutate: startSetup } = setup;

  // Una clave nueva cada vez que se abre: la anterior, sin confirmar, deja de servir.
  useEffect(() => startSetup(), [startSetup]);

  const qr = useMemo(
    () =>
      setup.data
        ? `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(setup.data.otpauthUrl, { pixelSize: 6, border: 2 }))}`
        : null,
    [setup.data],
  );

  if (recoveryCodes) return <RecoveryCodesView codes={recoveryCodes} title="Verificación activada" onDone={onDone} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(twoFactorEnableSchema, { code });
    setErrors(result.errors);
    if (!result.success) return;
    try {
      setRecoveryCodes((await enable.mutateAsync(result.data.code)).recoveryCodes);
    } catch (error) {
      setErrors({ code: getErrorMessage(error) });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Activar la verificación en dos pasos</DialogTitle>
        <DialogDescription>
          Instala en tu celular Google Authenticator o Microsoft Authenticator (gratis), pulsa «+» y escanea este código.
        </DialogDescription>
      </DialogHeader>
      {setup.isError ? (
        <ErrorState title="No pudimos generar el código QR" description={getErrorMessage(setup.error)} onRetry={() => startSetup()} />
      ) : (
        <div className="grid justify-items-center gap-3">
          <div className="flex size-52 items-center justify-center rounded-xl border bg-white p-2">
            {qr ? (
              <img src={qr} alt="Código QR para la app de autenticación" className="size-full" />
            ) : (
              <span className="text-sm text-muted-foreground">Generando…</span>
            )}
          </div>
          {setup.data && <SecretKey secret={setup.data.secret} />}
        </div>
      )}
      <FormField label="Código que muestra la app" error={errors.code}>
        {(field) => (
          <Input
            {...field}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            className="h-10 font-mono text-lg tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={enable.isPending}>
          Cancelar
        </Button>
        <SubmitButton disabled={!setup.data} loading={enable.isPending} loadingText="Activando…">
          Activar
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** La clave en grupos de 4, para escribirla a mano si no se puede escanear el QR. */
function SecretKey({ secret }: { secret: string }) {
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;
  return (
    <details className="w-full text-center text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">¿No puedes escanearlo?</summary>
      <p className="mt-2 text-muted-foreground">En la app elige «Introducir una clave» y escribe:</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs break-all">{grouped}</code>
        <CopyButton text={secret} label="Copiar clave" />
      </div>
    </details>
  );
}

/* ------------------------------------------------- Códigos de recuperación -- */

function RegenerateFlow({ onDone }: { onDone: () => void }) {
  const regenerate = useRegenerateRecoveryCodes();
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  if (recoveryCodes) return <RecoveryCodesView codes={recoveryCodes} title="Códigos de recuperación nuevos" onDone={onDone} />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(twoFactorConfirmSchema, { code });
    setErrors(result.errors);
    if (!result.success) return;
    try {
      setRecoveryCodes((await regenerate.mutateAsync(result.data.code)).recoveryCodes);
    } catch (error) {
      setErrors({ code: getErrorMessage(error) });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Generar códigos de recuperación nuevos</DialogTitle>
        <DialogDescription>Los códigos que tienes ahora dejarán de servir. Confirma con el código de la app.</DialogDescription>
      </DialogHeader>
      <FormField label="Código de la app" error={errors.code}>
        {(field) => (
          <Input
            {...field}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            className="h-10 font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={regenerate.isPending}>
          Cancelar
        </Button>
        <SubmitButton loading={regenerate.isPending} loadingText="Generando…">
          Generar
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** Los códigos sólo se ven ahora: se pueden copiar o descargar antes de cerrar. */
function RecoveryCodesView({ codes, title, onDone }: { codes: string[]; title: string; onDone: () => void }) {
  const text = codes.join("\n");
  const download = () => {
    const content = `Códigos de recuperación de Agenda360\nCada código sirve una sola vez para entrar sin el celular.\n\n${text}\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "agenda360-codigos-de-recuperacion.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Guarda estos códigos en un lugar seguro (fuera del celular). Si pierdes el celular, cada uno te deja entrar una vez.
          <strong className="text-foreground"> No se volverán a mostrar.</strong>
        </DialogDescription>
      </DialogHeader>
      <ul className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-4 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="text-center tracking-wide">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-center gap-2">
        <CopyButton text={text} label="Copiar" />
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download /> Descargar .txt
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" onClick={onDone}>
          Ya los guardé
        </Button>
      </DialogFooter>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("No se pudo copiar. Selecciona el texto y cópialo a mano.");
        }
      }}
    >
      {copied ? <Check /> : <Copy />} {copied ? "Copiado" : label}
    </Button>
  );
}

/* ------------------------------------------------------------- Desactivar -- */

function DisableForm({ onDone }: { onDone: () => void }) {
  const disable = useDisableTwoFactor();
  const [values, setValues] = useState({ password: "", code: "" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(twoFactorDisableSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await disable.mutateAsync(result.data);
      toast.success("Verificación en dos pasos desactivada");
      onDone();
    } catch (error) {
      const message = getErrorMessage(error);
      setErrors(/contraseña/i.test(message) ? { password: message } : { code: message });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Desactivar la verificación en dos pasos</DialogTitle>
        <DialogDescription>Tu cuenta quedará protegida sólo con la contraseña. Confirma que eres tú.</DialogDescription>
      </DialogHeader>
      <FormField label="Contraseña" error={errors.password}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Código de la app (o de recuperación)" error={errors.code}>
        {(field) => (
          <Input
            {...field}
            autoComplete="one-time-code"
            placeholder="123456"
            className="h-10 font-mono"
            value={values.code}
            onChange={(e) => setValues({ ...values, code: e.target.value })}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={disable.isPending}>
          Cancelar
        </Button>
        <SubmitButton variant="destructive" loading={disable.isPending} loadingText="Desactivando…">
          Desactivar
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
