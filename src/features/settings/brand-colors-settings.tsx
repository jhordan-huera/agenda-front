import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandColorsPicker } from "@/features/branding/brand-colors-picker";
import { ModePreviews } from "@/features/branding/mode-previews";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { DEFAULT_BRAND_COLORS, resolveBrandPalette } from "@/lib/brand-theme";
import { getErrorMessage } from "@/lib/data";
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
      <div className="grid grid-cols-1 gap-6">
        <BrandColorsPicker colors={colors} onChange={(next) => setField("colors", next)} />

        <BrandPreview colors={effective} slug={business.slug} />
      </div>
    </SettingsSection>
  );
}

/**
 * Cómo se verán el panel y la página de reservas con estos colores, en claro y en oscuro (spec 019).
 * Lleva su propia paleta, así que no depende de los colores guardados.
 */
function BrandPreview({ colors, slug }: { colors: BrandColors; slug: string }) {
  return (
    <figure className="grid gap-2">
      <figcaption className="flex items-center justify-between gap-2 text-sm font-semibold">
        Vista previa
        <Button asChild variant="link" size="sm" className="h-auto px-0">
          <a href={`/book/${slug}`} target="_blank" rel="noreferrer">
            Tu página de reservas <ExternalLink />
          </a>
        </Button>
      </figcaption>
      <ModePreviews palettes={resolveBrandPalette(colors)} className="bg-muted" testId="brand-preview">
        {/* El menú del panel: lo activo, en el azul pastel de la marca */}
        <div className="flex flex-wrap gap-1 border-b bg-sidebar p-2 text-xs font-medium text-sidebar-foreground">
          <span className="rounded-lg bg-sidebar-accent px-2.5 py-1.5 font-semibold text-sidebar-accent-foreground">
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
      </ModePreviews>
    </figure>
  );
}
