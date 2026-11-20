import { Check, Copy, KeyRound, MailCheck, Shuffle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSetUserPassword } from "@/hooks/queries/use-admin";
import { generateTemporaryPassword } from "@/lib/constants/auth";
import { getErrorMessage } from "@/lib/data";
import { publicOrigin } from "@/lib/public-url";
import { userPasswordSchema } from "@/lib/validations/admin";
import { validate } from "@/lib/validations/validate";
import { buildTemporaryPasswordMessage, getShareWhatsAppUrl, getSupportWhatsAppUrl } from "@/lib/whatsapp";

export interface PasswordTarget {
  id: string;
  name: string;
  email: string;
  /** El teléfono de la cuenta, si lo tiene: «Enviar por WhatsApp» abre su chat (spec 054). */
  phone?: string;
}

/**
 * Formulario del diálogo «Cambiar contraseña» (ver useSetPasswordDialog). La contraseña es temporal (spec 054): le llega
 * por email y, al entrar con ella, la persona crea la suya. Al guardarla, «Enviar por WhatsApp» y «Copiar mensaje» con
 * el mensaje ya escrito (pedido del dueño, 2026-11-20). El mensaje se arma aquí con la contraseña que se escribió o
 * generó: la API no la devuelve ni la guarda.
 */
export function SetPasswordForm({ target, onDone }: { target: PasswordTarget; onDone: () => void }) {
  const setPassword = useSetUserPassword();
  const [password, setPasswordValue] = useState("");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(userPasswordSchema, { password });
    setError(validation.errors.password);
    if (!validation.success) return;
    try {
      await setPassword.mutateAsync({ userId: target.id, password: validation.data.password });
      setSaved(validation.data.password);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
    }
  };

  if (saved) return <TemporaryPasswordReady target={target} password={saved} onDone={onDone} />;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden /> Cambiar la contraseña de {target.name}
        </DialogTitle>
        <DialogDescription>
          Es una contraseña temporal: se la enviamos por email a {target.email}, se cierran sus sesiones abiertas y, al entrar
          con ella, crea la suya.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Contraseña temporal" error={error} hint="Mínimo 8 caracteres. Escríbela o genera una al azar.">
        {(field) => (
          <div className="flex gap-2">
            <Input
              {...field}
              autoFocus
              autoComplete="off"
              className="min-w-0 flex-1 font-mono"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPasswordValue(generateTemporaryPassword());
                setError(undefined);
              }}
            >
              <Shuffle /> Generar una
            </Button>
          </div>
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={setPassword.isPending} loadingText="Guardando…">
          Guardar contraseña
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** «Contraseña temporal lista»: ya salió el email; además, por WhatsApp o copiando el mensaje. */
function TemporaryPasswordReady({ target, password, onDone }: { target: PasswordTarget; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = buildTemporaryPasswordMessage({
    firstName: target.name.split(" ")[0] ?? target.name,
    email: target.email,
    password,
    loginUrl: `${publicOrigin()}/login`,
  });
  // Con su teléfono, su chat; sin él, WhatsApp pide elegir el contacto.
  const whatsAppUrl = (target.phone ? getSupportWhatsAppUrl(target.phone, message) : null) ?? getShareWhatsAppUrl(message);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el mensaje y cópialo a mano.");
    }
  };

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MailCheck className="size-5 text-primary" aria-hidden /> Contraseña temporal lista
        </DialogTitle>
        <DialogDescription>
          Se la enviamos por email a {target.email}. Si quieres, mándasela también por WhatsApp: al entrar con ella, creará
          la suya.
        </DialogDescription>
      </DialogHeader>
      <pre className="max-h-48 overflow-auto rounded-lg bg-muted px-3.5 py-3 font-mono text-sm whitespace-pre-wrap">{message}</pre>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild>
          <a href={whatsAppUrl} target="_blank" rel="noreferrer">
            <WhatsAppIcon /> Enviar por WhatsApp
          </a>
        </Button>
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar mensaje"}
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Listo
        </Button>
      </DialogFooter>
    </div>
  );
}
