import { Check, Copy, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { ErrorState } from "@/components/shared/error-state";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { useBusinessReferrals } from "@/hooks/queries/use-account";
import { APP_NAME } from "@/lib/constants/app";
import { formatReferralAmount, REFERRAL_DISCOUNT } from "@/lib/constants/business";
import { getShareWhatsAppUrl } from "@/lib/whatsapp";

/** El mensaje de «Compartir por WhatsApp»: el negocio elige a qué colega se lo manda. */
const shareMessage = (link: string) => `Te recomiendo ${APP_NAME} para manejar tu agenda y tus reservas online: ${link}`;

/**
 * «Recomienda Agenda360» (spec 023), en Configuración → Negocio: el enlace propio del negocio con «Copiar»
 * y «Compartir por WhatsApp», cuántos recomendó y cuántos se quedaron, y el premio. Sólo el propietario
 * (y el super admin en modo soporte, que actúa como él): los administradores, Recepción y el rol
 * Profesional no la ven. El descuento es la única cifra de dinero que ve un negocio (constitución,
 * principio III).
 */
export function ReferralCard() {
  const { session } = useSession();
  const isOwner = session?.role === "owner";
  const referrals = useBusinessReferrals(isOwner);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  if (!isOwner) return null;

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const data = referrals.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={Gift} /> Recomienda {APP_NAME}
        </CardTitle>
        <CardDescription>
          Por cada colega que se quede, {formatReferralAmount(REFERRAL_DISCOUNT)} menos en tu siguiente mensualidad.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {referrals.isPending ? (
          <div className="grid gap-3" role="status" aria-label="Cargando">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : referrals.isError || !data ? (
          <ErrorState onRetry={() => referrals.refetch()} />
        ) : (
          <>
            <div className="grid gap-2 rounded-lg bg-muted/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Tu enlace para recomendar</p>
              <p className="truncate text-sm font-semibold text-ink" title={data.link}>
                {data.link}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => copy(data.link)}>
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={getShareWhatsAppUrl(shareMessage(data.link))} target="_blank" rel="noreferrer">
                    <WhatsAppIcon className="size-4" /> Compartir por WhatsApp
                  </a>
                </Button>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Recomendaste</dt>
                <dd className="mt-0.5 text-2xl font-extrabold tabular-nums">{data.referred}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Se quedaron</dt>
                <dd className="mt-0.5 text-2xl font-extrabold tabular-nums">{data.qualified}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {data.referred === 0
                ? "Cuando un colega abra tu enlace y nos escriba, lo anotamos como recomendado por ti."
                : "Se queda quien sigue con su agenda un mes después de empezar. El descuento lo aplicamos al cobrarte."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
