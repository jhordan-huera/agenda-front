import { FileStack, Settings2 } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/use-permissions";
import { useBusinessTemplate } from "./use-business-template";

/**
 * Con qué formato se registran las evoluciones nuevas: el del negocio (elegido o recomendado) y
 * los servicios que usan el suyo. El propietario puede cambiarlo desde aquí.
 */
export function BusinessTemplateBanner() {
  const { can } = usePermissions();
  const { templates, template, chosen, exceptions } = useBusinessTemplate();

  if (templates.isPending) return <Skeleton className="h-[74px] rounded-xl" />;
  if (!template) return null;

  return (
    <section
      aria-label="Formato de las evoluciones"
      className="flex flex-col gap-3 rounded-xl border border-ink/15 bg-accent/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-card text-ink shadow-xs">
          <FileStack className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Las evoluciones nuevas se registran con</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold text-ink" data-testid="business-template">
            {template.name}
            {template.businessId && <Badge variant="secondary">Creado por ti</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chosen ? "Lo elegiste para todo tu negocio." : "Es el recomendado para tu especialidad. Puedes elegir otro para todo tu negocio."}
            {exceptions.length > 0 &&
              ` En las citas de ${exceptions.map((e) => `${e.service.name} se usa «${e.template.name}»`).join(", en las de ")}.`}
          </p>
        </div>
      </div>
      {can("business.manage") && (
        <Button asChild variant="outline" size="sm" className="shrink-0 self-start bg-card sm:self-center">
          <Link to="/dashboard/clinical-templates">
            <Settings2 /> Cambiar formato
          </Link>
        </Button>
      )}
    </section>
  );
}
