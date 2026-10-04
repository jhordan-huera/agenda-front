import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import type { Permission } from "@/lib/permissions";

/**
 * Protección de ruta por rol. Sólo mejora la experiencia: aunque alguien la
 * saltara, el backend rechaza igualmente las operaciones sin permiso.
 */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = usePermissions();
  if (can(permission)) return children;
  return (
    <EmptyState
      icon={ShieldAlert}
      title="No tienes acceso a esta sección"
      description="Tu rol no incluye este permiso. Pide al propietario del negocio que lo actualice si lo necesitas."
      action={
        <Button asChild variant="outline">
          <Link to="/dashboard">Volver al dashboard</Link>
        </Button>
      }
    />
  );
}
