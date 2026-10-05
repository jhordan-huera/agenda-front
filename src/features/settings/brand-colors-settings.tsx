import { Check, ExternalLink, Info } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import {
  BRAND_PRESETS,
  brandThemeVariables,
  DEFAULT_BRAND_COLORS,
  normalizeHex,
  resolveBrandPalette,
  sameColors,
} from "@/lib/brand-theme";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { BrandColors, Business } from "@/types";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

/**
 * Colores de la marca del negocio: una paleta lista o dos colores a elección. Se ven al momento en
 * la vista previa; al guardar, el panel y la página de reservas pasan a usarlos.
 */
export function BrandColorsSettings({ business }: { business: Business }) {
  const updateBusiness = useUpdateBusiness();
  const { values, setField, dirty, reset } = useSettingsForm<{
    colors: BrandColors | null;
  }>({ colors: business.brandColors });
  const colors = values.colors;
  const effective = colors ?? DEFAULT_BRAND_COLORS;
  const palette = resolveBrandPalette(effective);

  // Elegir a mano los colores de Agenda360 es lo mismo que no tener colores propios.
  const setColors = (next: BrandColors | null) =>
    setField(
      "colors",
      next && sameColors(next, DEFAULT_BRAND_COLORS) ? null : next,
    );

  const submit = async () => {
    try {
      await updateBusiness.mutateAsync({ brandColors: values.colors });
      reset(values);
      toast.success("Colores guardados", {
        description: "Ya se ven en tu panel y en tu página de reservas.",
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Colores de tu marca"
      description="Se usan en tu panel y en tu página de reservas: tus clientes los verán al reservar."
      dirty={dirty}
      saving={updateBusiness.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="grid gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-semibold">
              Paletas listas
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRAND_PRESETS.map((preset) => {
                const swatch = preset.colors ?? DEFAULT_BRAND_COLORS;
                const checked = sameColors(preset.colors, colors);
                return (
                  <label key={preset.id} className="relative">
                    <input
                      type="radio"
                      name="brand-preset"
                      value={preset.id}
                      checked={checked}
                      onChange={() => setColors(preset.colors)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-2.5 py-2.5 text-sm font-medium transition-[border-color,box-shadow] duration-150 hover:border-rule-strong",
                        "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                        checked && "border-ink/50 ring-1 ring-ink/30",
                      )}
                    >
                      <Swatches colors={swatch} />
                      <span
                        className="min-w-0 flex-1 truncate"
                        title={preset.name}
                      >
                        {preset.name}
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
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-semibold">
              O elige tus colores
            </legend>
            <p className="text-xs text-muted-foreground">
              Por ejemplo, los de tu logo. El resto de tonos (fondos, bordes,
              textos) se calculan solos a partir de estos dos.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Color principal"
                description="Botones, títulos y lo activo."
                value={effective.primary}
                onChange={(primary) => setColors({ ...effective, primary })}
              />
              <ColorField
                label="Color de resaltado"
                description="Lo elegido o lo nuevo: la hora reservada, el día elegido."
                value={effective.highlight}
                onChange={(highlight) => setColors({ ...effective, highlight })}
              />
            </div>
            {(palette.inkAdjusted || palette.highlightAdjusted) && (
              <p
                className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground"
                role="status"
              >
                <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                <span>
                  {palette.inkAdjusted &&
                    "Tu color principal es muy claro para escribir en blanco encima: en botones y títulos se usa un poco más oscuro. "}
                  {palette.highlightAdjusted &&
                    "El resaltado se aclaró un poco para que el texto encima se lea. "}
                  Así lo ves en la vista previa.
                </span>
              </p>
            )}
          </fieldset>
        </div>

        <BrandPreview colors={effective} slug={business.slug} />
      </div>
    </SettingsSection>
  );
}

function Swatches({ colors }: { colors: BrandColors }) {
  return (
    <span className="flex shrink-0" aria-hidden>
      <span
        className="size-4.5 rounded-full ring-2 ring-card"
        style={{ background: colors.primary }}
      />
      <span
        className="-ml-1.5 size-4.5 rounded-full ring-2 ring-card"
        style={{ background: colors.highlight }}
      />
    </span>
  );
}

interface ColorFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
}

/** Selector del sistema (el cuadro de color) y el código #RRGGBB, que también se puede escribir. */
function ColorField({ label, description, value, onChange }: ColorFieldProps) {
  const id = useId();
  // Lo escrito a medias (#4a6) no se aplica hasta que sea un color válido.
  const [draft, setDraft] = useState<{ text: string; for: string } | null>(
    null,
  );
  const text = draft?.for === value ? draft.text : value.toUpperCase();
  const invalid = draft?.for === value && normalizeHex(draft.text) === null;

  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}: elegir en la paleta`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-card p-0.5 [&::-moz-color-swatch]:rounded-[5px] [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-[5px] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <Input
          id={id}
          value={text}
          spellCheck={false}
          maxLength={7}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-description`}
          className="h-9 font-medium uppercase tabular-nums"
          onChange={(event) => {
            const hex = normalizeHex(event.target.value);
            if (hex && event.target.value.replace("#", "").length === 6) {
              setDraft(null);
              onChange(hex);
            } else {
              setDraft({ text: event.target.value, for: value });
            }
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      <p id={`${id}-description`} className="text-xs text-muted-foreground">
        {invalid ? "Escribe el color como #RRGGBB." : description}
      </p>
    </div>
  );
}

/**
 * Cómo se verán el panel y la página de reservas con estos colores. Lleva su propia paleta, así
 * que no depende de los colores guardados.
 */
function BrandPreview({ colors, slug }: { colors: BrandColors; slug: string }) {
  const palette = resolveBrandPalette(colors);
  const style = brandThemeVariables(palette) as CSSProperties;

  return (
    <figure className="grid gap-2 lg:sticky lg:top-6">
      <figcaption className="flex items-center justify-between gap-2 text-sm font-semibold">
        Vista previa
        <Button asChild variant="link" size="sm" className="h-auto px-0">
          <a href={`/book/${slug}`} target="_blank" rel="noreferrer">
            Tu página de reservas <ExternalLink />
          </a>
        </Button>
      </figcaption>
      <div
        style={style}
        className="overflow-hidden rounded-xl border bg-muted text-foreground"
        data-testid="brand-preview"
        aria-hidden
      >
        {/* Pestañas del panel */}
        <div className="flex gap-1 border-b bg-sidebar px-3 pt-3 text-xs font-medium text-sidebar-foreground">
          <span className="rounded-t-md bg-card px-2.5 py-1.5 font-semibold text-ink">
            Inicio
          </span>
          <span className="px-2.5 py-1.5">Agenda</span>
          <span className="px-2.5 py-1.5">Clientes</span>
        </div>
        <div className="grid gap-3 bg-card p-4">
          <div className="rounded-lg bg-accent p-3">
            <p className="text-xs text-muted-foreground">Próxima cita</p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink tabular-nums">
              <span className="marker">10:00</span>
            </p>
            <p className="text-sm font-semibold">María López</p>
            <p className="text-xs text-muted-foreground">
              Consulta inicial, 1 h
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
              Confirmar cita
            </span>
            <span className="inline-flex h-8 items-center rounded-md border bg-card px-3 text-xs font-semibold">
              Ver ficha
            </span>
            <Badge variant="secondary">Nueva reserva</Badge>
          </div>
        </div>
        {/* Horas en la página de reservas */}
        <div className="grid gap-2 border-t p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Página de reservas
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-bold tabular-nums">
            <span className="rounded-md bg-accent py-1.5 text-ink">09:00</span>
            <span className="rounded-md bg-primary py-1.5 text-primary-foreground ring-2 ring-highlight">
              10:00
            </span>
            <span className="rounded-md bg-accent py-1.5 text-ink">11:30</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
