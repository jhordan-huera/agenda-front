import { CalendarX2, LinkIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimezoneNote } from "@/features/booking/timezone-note";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { BankTransferCard } from "@/features/payments/bank-transfer-card";
import { usePublicPayment } from "@/hooks/queries/use-public-booking";
import { DataError } from "@/lib/data";
import { capitalize, formatLongDate } from "@/lib/format";
import { getBusinessWhatsAppUrl, getReceiptWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Enlace privado de pago de una cita (/pago/:token, llega en el email de la reserva o por WhatsApp):
 * datos para transferir y envío del comprobante, sin sesión.
 */
export default function PaymentPage() {
  const { token = "" } = useParams<{ token: string }>();
  const query = usePublicPayment(token);

  if (query.isPending) {
    return (
      <div className="min-h-screen bg-muted p-4" role="status" aria-label="Cargando">
        <div className="mx-auto grid max-w-xl gap-4 py-8">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const payment = query.data;
  // Si falla una recarga en segundo plano (p. ej. al volver de la app del banco), se sigue mostrando
  // la página con lo que ya había: el error sólo se muestra si no hay datos.
  if (!payment) {
    const notFound = query.error instanceof DataError && query.error.code === "not_found";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <PageTitle title={notFound ? "Enlace no disponible" : "Pago de tu cita"} />
        <Logo />
        {notFound ? (
          <EmptyState
            icon={LinkIcon}
            className="w-full max-w-md"
            title="Este enlace de pago no está disponible"
            description="Revisa que el enlace esté completo o escríbele al negocio."
          />
        ) : (
          <ErrorState className="w-full max-w-md" onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  const { business } = payment;
  const closed = payment.status === "cancelled" || payment.status === "no_show";

  return (
    <BrandThemeProvider colors={business.brandColors}>
      <div className="flex min-h-screen flex-col bg-muted">
        <PageTitle title={`Pago de tu cita · ${business.name}`} />
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-xl items-center gap-4 px-4 py-6">
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={`Logo de ${business.name}`}
                className="h-14 w-auto max-w-40 shrink-0 rounded-xl border bg-white object-contain p-1"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Pago de tu cita</p>
              <h1 className="text-2xl leading-tight font-extrabold tracking-[-0.02em]">{business.name}</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-xl flex-1 gap-4 px-4 py-6">
          <section className="rounded-2xl border bg-background p-5 sm:p-6">
            <p className="text-muted-foreground">Hola {payment.clientName}, esta es tu cita:</p>
            <p className="mt-2 text-xl font-bold">{payment.serviceName}</p>
            <p className="mt-1">
              {capitalize(formatLongDate(payment.date))} · {payment.startTime} a {payment.endTime}
            </p>
            <p className="text-sm text-muted-foreground">Con {payment.professionalName}</p>
            <TimezoneNote timezone={business.timezone} date={payment.date} time={payment.startTime} className="mt-2" />
          </section>

          {closed ? (
            <EmptyState
              icon={CalendarX2}
              title={payment.status === "cancelled" ? "Esta cita se canceló" : "Esta cita ya pasó"}
              description="Ya no hace falta pagarla. Si transferiste, escríbele al negocio."
              action={
                getBusinessWhatsAppUrl(business) && (
                  <Button asChild variant="outline">
                    <a href={getBusinessWhatsAppUrl(business)!} target="_blank" rel="noreferrer">
                      Escribir al negocio
                    </a>
                  </Button>
                )
              }
            />
          ) : payment.bankAccount ? (
            <BankTransferCard
              bankAccount={payment.bankAccount}
              amount={payment.amount}
              currency={business.currency}
              token={token}
              receiptsEnabled={payment.receiptsEnabled}
              whatsappUrl={getReceiptWhatsAppUrl(business, payment)}
              receiptsSent={payment.receipts.length}
              paid={payment.paid}
            />
          ) : (
            <p className="rounded-2xl border bg-background p-5 text-sm text-muted-foreground">
              El negocio ya no tiene datos para transferencias. Pregúntale cómo pagar tu cita.
            </p>
          )}

          <Button asChild variant="link" className="justify-self-center">
            <Link to={`/book/${business.slug}`}>Reservar otra cita con {business.name}</Link>
          </Button>
        </main>
      </div>
    </BrandThemeProvider>
  );
}
