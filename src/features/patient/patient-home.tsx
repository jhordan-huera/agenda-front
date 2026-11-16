import { QrCode } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandThemeProvider } from "@/features/branding/brand-theme-provider";
import { SocialLinks } from "@/features/loyalty/social-links";
import { usePatientCards } from "@/hooks/queries/use-patient-account";
import type { PatientAccount, PatientCard } from "@/types";
import { PasswordResetNotice } from "./password-reset-notice";
import { firstName, stampsSummary } from "./patient-card-text";
import { PatientLoyaltyCard } from "./patient-loyalty-card";
import { PatientQrDialog, PatientQrImage } from "./patient-qr";
import { PatientRewards } from "./patient-rewards";
import { PatientSettingsSheet } from "./patient-settings-sheet";
import { PatientShell } from "./patient-shell";
import { PatientVisits } from "./patient-visits";

/** `?consultorio=<slug>`: la tarjeta elegida (sobrevive a recargar la página). */
const CARD_PARAM = "consultorio";

/**
 * «Mi tarjeta» con sesión (spec 052, diseño B «Tarjeta clara»): la tarjeta del consultorio, con sus colores y su logo
 * (si tiene varias, un selector arriba), o, sin tarjetas todavía, su QR para la próxima cita. Abajo, «Mostrar mi QR»;
 * arriba, el engranaje.
 */
export function PatientHome({ account }: { account: PatientAccount }) {
  const cardsQuery = usePatientCards(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cards = cardsQuery.data ?? [];
  const card = cards.find((item) => item.business.slug === searchParams.get(CARD_PARAM)) ?? cards[0] ?? null;

  return (
    <BrandThemeProvider colors={card?.business.brandColors ?? null}>
      <PageTitle title={card ? `Mi tarjeta · ${card.business.name}` : "Mi tarjeta"} />
      <PatientShell business={card?.business ?? null} stampIcon={card?.program.stampIcon} onSettings={() => setSettingsOpen(true)}>
        <PasswordResetNotice reset={account.passwordReset} />
        {cardsQuery.isPending ? (
          <div role="status" aria-label="Cargando tu tarjeta" className="space-y-4 pb-8">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-72 rounded-[1.25rem]" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : cardsQuery.isError ? (
          <ErrorState className="mb-8" onRetry={() => cardsQuery.refetch()} />
        ) : !card ? (
          <NoCardYet account={account} onShowQr={() => setQrOpen(true)} />
        ) : (
          <>
            <div className="flex-1 pb-6">
              {cards.length > 1 && (
                <CardPicker
                  cards={cards}
                  value={card.business.slug}
                  onChange={(slug) => setSearchParams({ [CARD_PARAM]: slug }, { replace: true })}
                />
              )}
              <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] break-words">Hola, {firstName(account.name)}</h1>
              <p className="mt-1.5 text-sm leading-normal text-muted-foreground">{stampsSummary(card)}</p>
              {card.program.description && <p className="mt-1 text-sm leading-normal text-muted-foreground">{card.program.description}</p>}
              <PatientLoyaltyCard card={card} />
              <PatientRewards card={card} />
              <PatientVisits visits={card.visits} />
              <SocialLinks links={card.business.socialLinks} businessName={card.business.name} className="mt-8" />
            </div>
            {/* «Mostrar mi QR» siempre a mano, abajo, como en una app. */}
            <div className="sticky bottom-0 z-10 -mx-4 bg-muted px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-canvas">
              <Button className="h-14 w-full rounded-xl text-[0.9375rem] font-bold" onClick={() => setQrOpen(true)}>
                <QrCode className="size-5" aria-hidden /> Mostrar mi QR
              </Button>
            </div>
          </>
        )}
      </PatientShell>
      <PatientQrDialog open={qrOpen} onOpenChange={setQrOpen} account={account} />
      <PatientSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} account={account} />
    </BrandThemeProvider>
  );
}

/** Con varias tarjetas: de qué consultorio ver la tarjeta. */
function CardPicker({ cards, value, onChange }: { cards: PatientCard[]; value: string; onChange: (slug: string) => void }) {
  return (
    <div className="mb-4 grid gap-1.5">
      <Label htmlFor="patient-card-picker">Consultorio</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="patient-card-picker" className="h-11 w-full bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {cards.map((item) => (
            <SelectItem key={item.business.id} value={item.business.slug}>
              {item.business.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Con sesión y sin tarjetas: su QR, para que el consultorio lo escanee en la próxima cita y la una a su ficha. */
function NoCardYet({ account, onShowQr }: { account: PatientAccount; onShowQr: () => void }) {
  return (
    <div className="space-y-5 pb-8 text-center">
      <div>
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] break-words">Hola, {firstName(account.name)}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Este es tu QR. Muéstralo en tu próxima cita para empezar a sumar sellos.
        </p>
      </div>
      {/* La placa blanca va también en el oscuro: el QR necesita fondo blanco para escanearse. */}
      <div className="mx-auto w-fit rounded-3xl border bg-white p-4">
        <PatientQrImage token={account.qrToken} className="size-56" />
      </div>
      <Button variant="outline" size="lg" className="h-11" onClick={onShowQr}>
        <QrCode aria-hidden /> Verlo en pantalla completa
      </Button>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Cuando tu consultorio lo escanee, aquí verás tu tarjeta con tus sellos y tus premios. Si vas a varios consultorios,
        muéstralo en cada uno.
      </p>
    </div>
  );
}
