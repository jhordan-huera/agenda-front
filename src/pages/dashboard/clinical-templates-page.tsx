import { CircleCheck, Copy, Eye, FileStack, Info, Lock, Pencil, Plus, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/features/auth/use-permissions";
import { TemplatePreview } from "@/features/clinical/templates/template-preview";
import { useBusinessTemplate } from "@/features/clinical/use-business-template";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import { useSubscription } from "@/hooks/queries/use-account";
import { useSetClinicalTemplateActive, useSetDefaultClinicalTemplate } from "@/hooks/queries/use-clinical";
import { getPlan } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClinicalTemplate } from "@/types";

const countFields = (template: ClinicalTemplate) =>
  plural(template.fields.filter((field) => field.type !== "section").length, "campo", "campos");

/**
 * Formatos de historia clínica: cuál usa todo el negocio (lo primero que se ve), los propios
 * (planes de pago) y los de la plataforma.
 */
export default function ClinicalTemplatesPage() {
  const clinicalAccess = useClinicalAccess();
  const { can } = usePermissions();
  const { templates, template: current, chosen, exceptions } = useBusinessTemplate(clinicalAccess);
  const subscription = useSubscription();
  const setActive = useSetClinicalTemplateActive();
  const setDefault = useSetDefaultClinicalTemplate();
  const [previewing, setPreviewing] = useState<ClinicalTemplate | null>(null);

  if (!clinicalAccess || !can("business.manage")) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Sólo el propietario gestiona los formatos"
        description="Activa la historia clínica en Configuración → Negocio. Los formatos los gestiona el propietario."
      />
    );
  }

  const canEdit = Boolean(subscription.data && getPlan(subscription.data.plan).customClinicalTemplates);
  const own = (templates.data ?? []).filter((template) => template.businessId !== null);
  const platform = (templates.data ?? []).filter((template) => template.businessId === null);

  const toggle = async (template: ClinicalTemplate, active: boolean) => {
    try {
      await setActive.mutateAsync({ id: template.id, active });
      toast.success(
        active
          ? "Formato activado"
          : template.isDefault
            ? "Formato desactivado. Tu negocio vuelve a usar el recomendado para tu especialidad."
            : "Formato desactivado: ya no se ofrece al registrar evoluciones",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const makeBusinessDefault = async (template: ClinicalTemplate) => {
    try {
      await setDefault.mutateAsync(template.id);
      toast.success(`«${template.name}» es ahora el formato de tu negocio`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const cardActions = (template: ClinicalTemplate) => (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewing(template)}>
        <Eye /> Vista previa
      </Button>
      {!template.isDefault && template.isActive && (
        <SubmitButton
          type="button"
          size="sm"
          variant="secondary"
          loading={setDefault.isPending && setDefault.variables === template.id}
          disabled={setDefault.isPending}
          onClick={() => makeBusinessDefault(template)}
        >
          <CircleCheck /> Usar en todo el negocio
        </SubmitButton>
      )}
    </>
  );

  return (
    <div className="space-y-8">
      <PageTitle title="Formatos de historia clínica" />
      <PageHeader
        title="Formatos de historia clínica"
        description="Qué se registra en cada evolución. Elige el formato de tu negocio o crea los tuyos."
        actions={
          canEdit ? (
            <Button asChild size="lg">
              <Link to="/dashboard/clinical-templates/new">
                <Plus /> Nuevo formato
              </Link>
            </Button>
          ) : undefined
        }
      />

      {templates.isError ? (
        <ErrorState onRetry={() => templates.refetch()} />
      ) : templates.isPending || !current ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          <section
            aria-labelledby="business-template-heading"
            className="rounded-xl border border-ink/15 bg-accent/70 p-5 sm:p-6"
            data-testid="business-template-panel"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 id="business-template-heading" className="text-sm font-semibold text-muted-foreground">
                  Formato de tu negocio
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink">
                  {current.name}
                  {current.businessId && <Badge variant="secondary">Creado por ti</Badge>}
                </p>
                {current.description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{current.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{countFields(current)}</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0 self-start bg-card" onClick={() => setPreviewing(current)}>
                <Eye /> Ver sus campos
              </Button>
            </div>
            <ul className="mt-5 grid gap-2.5 border-t border-ink/10 pt-4 text-sm">
              <ExplainItem icon={chosen ? CircleCheck : Info}>
                {chosen
                  ? "Lo elegiste para todo tu negocio: se propone en cada evolución nueva."
                  : "Se eligió solo porque es el recomendado para tu especialidad. Para usar otro, pulsa «Usar en todo el negocio» en cualquier formato de abajo."}
              </ExplainItem>
              <ExplainItem icon={Info}>Al registrar una evolución puedes cambiarlo sólo para esa consulta.</ExplainItem>
              <ExplainItem icon={Info}>
                {exceptions.length > 0 ? (
                  <>
                    Excepciones: en las citas de{" "}
                    {exceptions.map((e) => `${e.service.name} se usa «${e.template.name}»`).join(", en las de ")}.{" "}
                    <Link to="/dashboard/services" className="font-semibold text-ink underline-offset-4 hover:underline">
                      Cambiar en Servicios
                    </Link>
                  </>
                ) : (
                  <>
                    Si un servicio necesita otro formato, elígelo al editar el servicio.{" "}
                    <Link to="/dashboard/services" className="font-semibold text-ink underline-offset-4 hover:underline">
                      Ir a Servicios
                    </Link>
                  </>
                )}
              </ExplainItem>
            </ul>
          </section>

          {!canEdit && subscription.isSuccess && (
            <p className="flex items-start gap-2 rounded-lg border border-highlight bg-highlight/40 px-3 py-2 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
              <span>
                Con los planes Pro y Business puedes crear formatos propios o adaptar los de la plataforma a tu manera de trabajar.{" "}
                <Link to="/dashboard/settings?tab=suscripcion" className="font-semibold text-ink underline underline-offset-4">
                  Ver planes
                </Link>
              </span>
            </p>
          )}

          <section aria-labelledby="own-heading" className="space-y-3">
            <h2 id="own-heading" className="font-semibold">
              Creados por ti <span className="font-normal text-muted-foreground">({own.length})</span>
            </h2>
            {own.length === 0 ? (
              <EmptyState
                icon={FileStack}
                title="Aún no tienes formatos propios"
                description={canEdit ? "Crea uno desde cero o duplica uno de la plataforma para adaptarlo." : "Disponibles en los planes Pro y Business."}
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {own.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    meta={`${countFields(template)}, versión ${template.version}`}
                    aside={
                      <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={template.isActive}
                          disabled={setActive.isPending}
                          onCheckedChange={(active) => toggle(template, active)}
                          aria-label={`${template.name} activo`}
                        />
                        {template.isActive ? "Activo" : "Inactivo"}
                      </label>
                    }
                  >
                    {cardActions(template)}
                    {canEdit && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/dashboard/clinical-templates/${template.id}`}>
                          <Pencil /> Editar
                        </Link>
                      </Button>
                    )}
                  </TemplateCard>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="platform-heading" className="space-y-3">
            <h2 id="platform-heading" className="font-semibold">
              Formatos de la plataforma
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {platform.map((template) => (
                <TemplateCard key={template.id} template={template} meta={countFields(template)}>
                  {cardActions(template)}
                  {canEdit && (
                    <Button asChild variant="ghost" size="sm" title="Crea una copia tuya para adaptarla">
                      <Link to={`/dashboard/clinical-templates/new?from=${template.id}`}>
                        <Copy /> Duplicar
                      </Link>
                    </Button>
                  )}
                </TemplateCard>
              ))}
            </div>
          </section>
        </>
      )}

      <Dialog open={Boolean(previewing)} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewing?.name}</DialogTitle>
            <DialogDescription>Vista previa: puedes probar los campos, no se guarda nada.</DialogDescription>
          </DialogHeader>
          {previewing && <TemplatePreview key={previewing.id} fields={previewing.fields} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExplainItem({ icon: Icon, children }: { icon: typeof Info; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

interface TemplateCardProps {
  template: ClinicalTemplate;
  meta: string;
  /** A la derecha del nombre (p. ej. activar o desactivar). */
  aside?: ReactNode;
  /** Acciones. */
  children: ReactNode;
}

/** Un formato; el del negocio se distingue con su marca y un borde más firme. */
function TemplateCard({ template, meta, aside, children }: TemplateCardProps) {
  return (
    <Card
      data-testid={`template-${template.id}`}
      className={cn("py-4", template.isDefault && "border-ink/40 ring-1 ring-ink/20", !template.isActive && "opacity-70")}
    >
      <CardContent className="grid gap-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {template.name}
              {template.isDefault && <Badge className="bg-highlight text-highlight-foreground">Formato de tu negocio</Badge>}
              {template.recommended && !template.isDefault && <Badge variant="outline">Para tu especialidad</Badge>}
            </p>
            {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
          </div>
          {aside}
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </CardContent>
    </Card>
  );
}
