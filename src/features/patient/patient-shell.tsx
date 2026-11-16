import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { MadeWithAgenda360 } from "@/components/shared/made-with";
import { Button } from "@/components/ui/button";
import { StampIcon } from "@/features/loyalty/stamp-icon";
import type { PatientCard, StampIcon as StampIconName } from "@/types";

/**
 * Las páginas de la cuenta del paciente (spec 052): la barra de arriba con el logo y el nombre del consultorio de la
 * tarjeta que ve (o el de Agenda360) y el engranaje; una columna angosta, también en el computador; y el pie de
 * siempre de las páginas del paciente.
 */
export function PatientShell({
  business,
  stampIcon,
  onSettings,
  children,
}: {
  /** null: sin tarjeta que mostrar (entrar, crear la cuenta, el enlace de la contraseña): el logo de Agenda360. */
  business: PatientCard["business"] | null;
  stampIcon?: StampIconName;
  /** Abre los ajustes de la cuenta (sólo con sesión). */
  onSettings?: () => void;
  children: ReactNode;
}) {
  return (
    // En el oscuro, el fondo es el lienzo: las tarjetas quedan más claras que él, como en el claro (spec 019).
    <div className="flex min-h-screen flex-col bg-muted dark:bg-canvas">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between gap-3 pr-2 pl-4">
          {business ? <BusinessMark business={business} stampIcon={stampIcon ?? "star"} /> : <Logo />}
          {onSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Ajustes de tu cuenta"
              onClick={onSettings}
            >
              <Settings className="size-5.5" aria-hidden />
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5">{children}</main>
      <MadeWithAgenda360>
        {" · "}
        <a href="/privacidad" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
          Privacidad
        </a>
      </MadeWithAgenda360>
    </div>
  );
}

/** El logo del consultorio (entero, sobre su placa blanca) o, sin logo, su sello en un círculo de su color. */
function BusinessMark({ business, stampIcon }: { business: PatientCard["business"]; stampIcon: StampIconName }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {business.logoUrl ? (
        // Sin recortar y sobre blanco también en el oscuro: un logo oscuro con fondo transparente no desaparece.
        <img
          src={business.logoUrl}
          alt={`Logo de ${business.name}`}
          className="h-10 w-auto max-w-24 shrink-0 rounded-lg border bg-white object-contain p-0.5"
        />
      ) : (
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <StampIcon icon={stampIcon} className="size-5" strokeWidth={1.8} />
        </span>
      )}
      <span className="truncate text-sm font-semibold">{business.name}</span>
    </div>
  );
}
