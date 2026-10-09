import type { FormEvent, ReactNode } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Hay cambios sin guardar: habilita "Guardar cambios" y "Descartar". */
  dirty: boolean;
  saving: boolean;
  /** Se está subiendo una imagen: "Guardar" espera a que termine (si no, la imagen se perdería). */
  uploading?: boolean;
  onSubmit: () => void | Promise<void>;
  onDiscard: () => void;
}

/** Tarjeta de configuración con formulario independiente y pie de guardar/descartar. */
export function SettingsSection({
  title,
  description,
  children,
  dirty,
  saving,
  uploading = false,
  onSubmit,
  onDiscard,
}: SettingsSectionProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (dirty && !saving && !uploading) void onSubmit();
  };

  return (
    <Card>
      {/* `contents`: el formulario no rompe el layout flex de la tarjeta. */}
      <form onSubmit={handleSubmit} noValidate className="contents">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-5">{children}</CardContent>
        <CardFooter className="flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {dirty && (
            <p className="text-center text-xs text-muted-foreground sm:mr-auto sm:text-left" role="status">
              Tienes cambios sin guardar
            </p>
          )}
          <Button type="button" variant="ghost" disabled={!dirty || saving || uploading} onClick={onDiscard}>
            Descartar
          </Button>
          <SubmitButton
            disabled={!dirty}
            loading={saving || uploading}
            loadingText={uploading ? "Subiendo imagen…" : "Guardando…"}
          >
            Guardar cambios
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}

/** Placeholder de carga con la forma de una tarjeta de configuración. */
export function SettingsSectionSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Card role="status" aria-label="Cargando">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="grid gap-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Skeleton className="h-8 w-36" />
      </CardFooter>
    </Card>
  );
}
