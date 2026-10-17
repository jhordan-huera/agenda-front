import { Check, MonitorSmartphone, Moon, Sun, type LucideIcon } from "lucide-react";
import { useContext, useId } from "react";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandPaletteContext } from "@/features/branding/brand-palette-context";
import { modeContainer } from "@/features/branding/mode-container";
import type { ResolvedTheme } from "@/features/theme/theme-mode";
import { useThemeMode } from "@/features/theme/use-theme-mode";
import { DEFAULT_BRAND_COLORS, resolveBrandPalette, type BrandPalettes } from "@/lib/brand-theme";
import { THEME_MODE_LABELS } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/types";

const OPTIONS: { mode: ThemeMode; icon: LucideIcon; hint?: string }[] = [
  { mode: "light", icon: Sun },
  { mode: "dark", icon: Moon },
  { mode: "auto", icon: MonitorSmartphone, hint: "Como tu aparato" },
];

const AGENDA360 = resolveBrandPalette(DEFAULT_BRAND_COLORS);

/**
 * «Modo de pantalla» (spec 019): Claro, Oscuro o Automático. Se guarda en la cuenta, así que se ve
 * igual en todos los equipos de la persona; el cambio se ve al instante, sin «Guardar». Va en
 * Configuración → Perfil (cada rol) y en la Configuración de /admin.
 */
export function ThemeModeCard({ icon }: { icon?: LucideIcon }) {
  const { mode, setMode } = useThemeMode();
  // Los dibujos, con los colores del panel que se está viendo (los del negocio o los de Agenda360).
  const palettes = useContext(BrandPaletteContext) ?? AGENDA360;
  const name = useId();
  const descriptionId = `${name}-description`;

  return (
    <Card>
      <CardHeader>
        <CardTitle id={name} className={cn(icon && "flex items-center gap-2.5")}>
          {icon && <CardTitleIcon icon={icon} />}
          Modo de pantalla
        </CardTitle>
        <CardDescription id={descriptionId}>
          Se guarda en tu cuenta: lo ves igual en todos los equipos donde entres. Las páginas de tus pacientes siguen al modo de su celular.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-labelledby={name} aria-describedby={descriptionId} className="grid grid-cols-3 gap-2 sm:gap-3">
          {OPTIONS.map((option) => {
            const checked = mode === option.mode;
            const Icon = option.icon;
            const label = THEME_MODE_LABELS[option.mode];
            return (
              <label key={option.mode} className="relative min-w-0">
                <input
                  type="radio"
                  name={name}
                  value={option.mode}
                  checked={checked}
                  onChange={() => setMode(option.mode)}
                  aria-label={option.hint ? `${label}, ${option.hint.toLowerCase()}` : label}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "grid cursor-pointer gap-2 rounded-lg border bg-card p-2 transition-[border-color,box-shadow] duration-150 hover:border-rule-strong sm:p-2.5",
                    "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                    checked && "border-ink/50 ring-1 ring-ink/30",
                  )}
                >
                  <ModeDrawing mode={option.mode} palettes={palettes} />
                  {/* A 390 px cada opción mide unos 100 px: el ícono se oculta para que «Automático» quepa entero. */}
                  <span className="flex min-w-0 items-start gap-1.5 text-[13px] font-medium sm:text-sm">
                    <Icon className="mt-0.5 hidden size-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
                    <span className="min-w-0 break-words">
                      <span className="block">{label}</span>
                      {option.hint && <span className="block text-xs leading-tight font-normal text-muted-foreground">{option.hint}</span>}
                    </span>
                  </span>
                </span>
                {checked && (
                  <span
                    className="absolute -top-1.5 -right-1.5 grid size-4.5 place-items-center rounded-full bg-ink text-primary-foreground"
                    aria-hidden
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** El dibujo de cada opción: una pantalla clara, una oscura, o mitad y mitad para «Automático». */
function ModeDrawing({ mode, palettes }: { mode: ThemeMode; palettes: BrandPalettes }) {
  if (mode !== "auto") return <MiniScreen mode={mode} palettes={palettes} />;
  return (
    <span className="relative block" aria-hidden>
      <MiniScreen mode="light" palettes={palettes} />
      <span className="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
        <MiniScreen mode="dark" palettes={palettes} />
      </span>
    </span>
  );
}

/** Una pantalla del panel en pequeño: el menú, un título, una tarjeta y un botón, con los colores de ese modo. */
function MiniScreen({ mode, palettes }: { mode: ResolvedTheme; palettes: BrandPalettes }) {
  const container = modeContainer(palettes, mode);
  return (
    <span
      style={container.style}
      className={cn(container.className, "flex aspect-[16/10] w-full overflow-hidden rounded-md border bg-canvas")}
      aria-hidden
    >
      <span className="w-1/4 border-r bg-sidebar p-1">
        <span className="block h-1 rounded-full bg-sidebar-accent" />
      </span>
      <span className="grid flex-1 content-start gap-1 p-1.5">
        <span className="block h-1 w-3/5 rounded-full bg-foreground/70" />
        <span className="block h-4 rounded-sm bg-card ring-1 ring-foreground/10" />
        <span className="block h-1.5 w-2/5 rounded-full bg-primary" />
      </span>
    </span>
  );
}
