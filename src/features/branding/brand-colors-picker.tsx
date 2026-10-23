import { Check, Info } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_PRESETS, DEFAULT_BRAND_COLORS, normalizeHex, resolveBrandPalette, sameColors } from "@/lib/brand-theme";
import { cn } from "@/lib/utils";
import type { BrandColors } from "@/types";

interface BrandColorsPickerProps {
  /** null: los colores de Agenda360. */
  colors: BrandColors | null;
  onChange: (colors: BrandColors | null) => void;
  /** Textos de ayuda: por defecto, los del negocio (su logo, la hora reservada…). */
  texts?: { intro: string; primary: string; highlight: string };
}

const BUSINESS_TEXTS = {
  intro: "Por ejemplo, los de tu logo. El resto de tonos (fondos, bordes, textos) se calculan solos a partir de estos dos.",
  primary: "Botones, títulos y lo activo.",
  highlight: "Lo elegido o lo nuevo: la hora reservada, el día elegido.",
};

/**
 * Las paletas listas y los dos colores a elección. Lo usan los colores de la marca de un negocio y
 * los del panel de cada super admin (spec 007): mismas paletas y mismas reglas de contraste.
 */
export function BrandColorsPicker({ colors, onChange, texts = BUSINESS_TEXTS }: BrandColorsPickerProps) {
  const name = useId();
  const effective = colors ?? DEFAULT_BRAND_COLORS;
  // Los avisos de «se ajustó» hablan del claro: en el oscuro los dos colores siempre se ajustan.
  const palette = resolveBrandPalette(effective).light;
  // Elegir a mano los colores de Agenda360 es lo mismo que no tener colores propios.
  const setColors = (next: BrandColors | null) => onChange(next && sameColors(next, DEFAULT_BRAND_COLORS) ? null : next);

  return (
    <div className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-semibold">
          Paletas listas
        </legend>
        {/* Las nueve paletas, de 3 en 3 (2 en el celular). */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BRAND_PRESETS.map((preset) => {
            const swatch = preset.colors ?? DEFAULT_BRAND_COLORS;
            const checked = sameColors(preset.colors, colors);
            return (
              <label key={preset.id} className="relative">
                <input
                  type="radio"
                  name={name}
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
        <p className="text-xs text-muted-foreground">{texts.intro}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorField
            label="Color principal"
            description={texts.primary}
            value={effective.primary}
            onChange={(primary) => setColors({ ...effective, primary })}
          />
          <ColorField
            label="Color de resaltado"
            description={texts.highlight}
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
