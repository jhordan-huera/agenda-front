import { Check, Copy, MailCheck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants/app";
import { formatClockTime } from "@/lib/format";
import type { PasswordLink } from "@/types";

const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * El enlace para definir la contraseña que acaba de salir por email. Si el email no llega, el super
 * admin lo copia (o lo comparte por WhatsApp) para pasárselo a la persona. Nunca ve la contraseña.
 */
export function PasswordLinkPanel({ link, firstName }: { link: PasswordLink; firstName: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  };
  const whatsAppText = `Hola ${firstName}, con este enlace defines tu contraseña de ${APP_NAME} (sirve una vez y caduca en 60 minutos): ${link.url}`;

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/40 p-4">
      <p className="flex items-start gap-2 text-sm">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          Le enviamos a <strong className="break-words">{link.email}</strong> un enlace para que defina su contraseña. Sirve una
          sola vez y caduca a las {formatClockTime(link.expiresAt, localTimezone())} (60 minutos).
        </span>
      </p>
      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">¿No le llega el email? Pásale el enlace:</p>
        <Input
          readOnly
          value={link.url}
          aria-label="Enlace para definir la contraseña"
          className="font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copiado" : "Copiar enlace"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`https://wa.me/?text=${encodeURIComponent(whatsAppText)}`} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> Enviar por WhatsApp
            </a>
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Compártelo sólo con esa persona: quien lo abra elige la contraseña de la cuenta. Si caduca, envía otro desde
        Usuarios.
      </p>
    </div>
  );
}

/** Paso final de un alta (propietario, miembro o super admin): el enlace que se le envió y "Listo". */
export function AccountCreatedStep({
  title,
  description,
  link,
  firstName,
  onDone,
}: {
  title: string;
  description: string;
  link: PasswordLink;
  firstName: string;
  onDone: () => void;
}) {
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserCheck className="size-5 text-primary" aria-hidden /> {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <PasswordLinkPanel link={link} firstName={firstName} />
      <DialogFooter>
        <Button type="button" onClick={onDone}>
          Listo
        </Button>
      </DialogFooter>
    </div>
  );
}
