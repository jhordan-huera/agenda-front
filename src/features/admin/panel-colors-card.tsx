import { Building2, LayoutDashboard, Palette, Plus, UsersRound } from "lucide-react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";
import { BrandColorsPicker } from "@/features/branding/brand-colors-picker";
import { SettingsSection } from "@/features/settings/settings-section";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useUpdatePanelColors } from "@/hooks/queries/use-admin";
import { brandThemeVariables, DEFAULT_BRAND_COLORS, resolveBrandPalette } from "@/lib/brand-theme";
import { getErrorMessage } from "@/lib/data";
import type { BrandColors } from "@/types";

const TEXTS = {
  intro: "El resto de tonos (fondos, bordes, textos) se calculan solos a partir de estos dos. Sólo cambian tu panel: los negocios y el resto del equipo no los ven.",
  primary: "Botones, menú, títulos y gráficos.",
  highlight: "El degradado de las cabeceras y lo resaltado.",
};

/**
 * Colores del panel de plataforma (spec 007): cada super admin elige los suyos y se guardan en su
 * cuenta, así que los ve en cualquier equipo. Al guardar, el panel cambia al momento.
 */
export function PanelColorsCard() {
  const { session } = useSession();
  const update = useUpdatePanelColors();
  const { values, setField, dirty, reset } = useSettingsForm<{ colors: BrandColors | null }>({ colors: session?.panelColors ?? null });

  const submit = async () => {
    try {
      await update.mutateAsync({ colors: values.colors });
      reset(values);
      toast.success("Colores guardados", { description: "Ya se ven en tu panel, también en otros equipos." });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Colores del panel"
      icon={Palette}
      description="Elige cómo se ve tu panel de plataforma."
      dirty={dirty}
      saving={update.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      {/* En dos columnas (pantallas anchas) la tarjeta es angosta: 3 paletas por fila. */}
      <BrandColorsPicker
        colors={values.colors}
        onChange={(next) => setField("colors", next)}
        texts={TEXTS}
        presetsClassName="xl:grid-cols-3 2xl:grid-cols-4"
      />
      <PanelPreview colors={values.colors ?? DEFAULT_BRAND_COLORS} />
    </SettingsSection>
  );
}

/** Cómo se verá el panel con estos colores, con su propia paleta (no depende de lo guardado). */
function PanelPreview({ colors }: { colors: BrandColors }) {
  const style = brandThemeVariables(resolveBrandPalette(colors)) as CSSProperties;
  return (
    <figure className="grid gap-2">
      <figcaption className="text-sm font-semibold">Vista previa</figcaption>
      <div style={style} className="overflow-hidden rounded-xl border bg-canvas text-foreground" data-testid="panel-preview" aria-hidden>
        <div className="flex gap-1 border-b bg-sidebar p-2 text-xs font-medium text-sidebar-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sidebar-accent px-2.5 py-1.5 font-semibold text-sidebar-accent-foreground">
            <LayoutDashboard className="size-3.5" /> Resumen
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5">
            <Building2 className="size-3.5" /> Negocios
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5">
            <UsersRound className="size-3.5" /> Usuarios
          </span>
        </div>
        <div className="grid gap-3 p-3">
          <div className="rounded-lg bg-linear-to-br from-ink to-lilac-ink px-3 py-2.5 text-white">
            <p className="text-sm font-bold">Clínica Dental Sonrisa</p>
            <p className="text-xs text-white/85">Odontología · Business</p>
          </div>
          <div className="flex items-end gap-1.5 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Citas agendadas</p>
              <p className="text-xl font-extrabold text-ink tabular-nums">124</p>
            </div>
            {[40, 64, 52, 80, 72].map((height, index) => (
              <span key={index} className="w-3 rounded-sm bg-chart-1" style={{ height: `${height / 3}px` }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
              <Plus className="size-3.5" /> Nuevo negocio
            </span>
            <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-xs font-medium text-ink ring-1 ring-ink/20 ring-inset">
              Pro
            </span>
            <span className="inline-flex h-6 items-center rounded-full border border-primary bg-accent px-2.5 text-xs font-medium text-ink">
              Activos 5
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
