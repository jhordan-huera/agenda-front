import type { ReactNode } from "react";
import type { ResolvedTheme } from "@/features/theme/theme-mode";
import type { BrandPalettes } from "@/lib/brand-theme";
import { cn } from "@/lib/utils";
import { modeContainer } from "./mode-container";

const MODES: { mode: ResolvedTheme; label: string }[] = [
  { mode: "light", label: "Claro" },
  { mode: "dark", label: "Oscuro" },
];

interface ModePreviewsProps {
  palettes: BrandPalettes;
  /** Las clases de cada vista previa (su fondo y su borde). */
  className: string;
  /** Para las pruebas: la clara lleva este id y la oscura, el mismo con «-dark». */
  testId: string;
  children: ReactNode;
}

/**
 * La vista previa de los colores en los dos modos, lado a lado (spec 019): la clara y la oscura, cada
 * una con su paleta. Si la tarjeta es angosta, una debajo de la otra.
 */
export function ModePreviews({ palettes, className, testId, children }: ModePreviewsProps) {
  return (
    <div className="@container" aria-hidden>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        {MODES.map(({ mode, label }) => {
          const container = modeContainer(palettes, mode);
          return (
            <div key={mode} className="grid min-w-0 content-start gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <div
                style={container.style}
                className={cn(container.className, "overflow-hidden rounded-xl border text-foreground", className)}
                data-testid={mode === "light" ? testId : `${testId}-dark`}
              >
                {children}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
