import { Copy, Eye, FileStack, Lock, Pencil, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/features/auth/use-permissions";
import { TemplatePreview } from "@/features/clinical/templates/template-preview";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import { useSubscription } from "@/hooks/queries/use-account";
import { useClinicalTemplates, useSetClinicalTemplateActive } from "@/hooks/queries/use-clinical";
import { getPlan } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClinicalTemplate } from "@/types";

const countFields = (template: ClinicalTemplate) =>
  plural(template.fields.filter((field) => field.type !== "section").length, "campo", "campos");

/** Formatos de historia clínica: los propios (planes de pago) y los de la plataforma. */
export default function ClinicalTemplatesPage() {
  const clinicalAccess = useClinicalAccess();
  const { can } = usePermissions();
  const templates = useClinicalTemplates(clinicalAccess, true);
  const subscription = useSubscription();
  const setActive = useSetClinicalTemplateActive();
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
      toast.success(active ? "Formato activado" : "Formato desactivado: ya no se ofrece al registrar evoluciones");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Formatos de historia clínica" />
      <PageHeader
        title="Formatos de historia clínica"
        description="Qué se registra en cada evolución. Usa los de la plataforma o crea los tuyos."
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

      {!canEdit && subscription.isSuccess && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Con los planes Pro y Business puedes crear formatos propios o adaptar los de la plataforma a tu manera de trabajar.{" "}
            <Link to="/dashboard/settings?tab=suscripcion" className="font-medium underline">
              Ver planes
            </Link>
          </span>
        </p>
      )}

      {templates.isError ? (
        <ErrorState onRetry={() => templates.refetch()} />
      ) : templates.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          <section aria-labelledby="own-heading" className="space-y-3">
            <h2 id="own-heading" className="font-semibold">
              Tus formatos <span className="font-normal text-muted-foreground">({own.length})</span>
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
                  <Card key={template.id} className={cn("py-4", !template.isActive && "opacity-70")}>
                    <CardContent className="grid gap-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{template.name}</p>
                          {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {countFields(template)} · versión {template.version}
                          </p>
                        </div>
                        <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <Switch
                            checked={template.isActive}
                            disabled={setActive.isPending}
                            onCheckedChange={(active) => toggle(template, active)}
                            aria-label={`${template.name} activo`}
                          />
                          {template.isActive ? "Activo" : "Inactivo"}
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setPreviewing(template)}>
                          <Eye /> Vista previa
                        </Button>
                        {canEdit && (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/dashboard/clinical-templates/${template.id}`}>
                              <Pencil /> Editar
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
                <Card key={template.id} className="py-4">
                  <CardContent className="grid gap-3 px-4">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {template.name}
                        {template.recommended && <Badge variant="secondary">Para tu especialidad</Badge>}
                      </p>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{countFields(template)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewing(template)}>
                        <Eye /> Vista previa
                      </Button>
                      {canEdit && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/dashboard/clinical-templates/new?from=${template.id}`}>
                            <Copy /> Duplicar y adaptar
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
