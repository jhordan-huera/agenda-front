import { ConciergeBell, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceCard } from "@/features/services/service-card";
import { ServiceFormDialog } from "@/features/services/service-form-dialog";
import { useDeleteService, useSaveService, useServices } from "@/hooks/queries/use-services";
import { getErrorMessage } from "@/lib/data";
import type { Service } from "@/types";

export default function ServicesPage() {
  return (
    <RequirePermission permission="services.manage">
      <ServicesPageContent />
    </RequirePermission>
  );
}

function ServicesPageContent() {
  const servicesQuery = useServices();
  const saveService = useSaveService();
  const deleteService = useDeleteService();
  const [formState, setFormState] = useState<{ open: boolean; service?: Service }>({ open: false });
  const [deleting, setDeleting] = useState<Service | null>(null);

  const services = servicesQuery.data ?? [];
  const activeCount = services.filter((s) => s.isActive).length;
  const openCreate = () => setFormState({ open: true });

  const toggleActive = async (service: Service) => {
    const { name, description, durationMinutes, price, showPrice, location, homeVisitFee, clinicalTemplateId } = service;
    try {
      await saveService.mutateAsync({
        id: service.id,
        input: {
          name,
          description,
          durationMinutes,
          price,
          showPrice,
          location,
          homeVisitFee,
          clinicalTemplateId,
          isActive: !service.isActive,
        },
      });
      toast.success(service.isActive ? "Servicio desactivado" : "Servicio activado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Servicios" />
      <PageHeader
        title="Servicios"
        description={
          servicesQuery.isSuccess
            ? `${activeCount} activo${activeCount === 1 ? "" : "s"} de ${services.length}`
            : "Lo que ofreces a tus clientes"
        }
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus /> Nuevo servicio
          </Button>
        }
      />

      {servicesQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : servicesQuery.isError ? (
        <ErrorState onRetry={() => servicesQuery.refetch()} />
      ) : services.length === 0 ? (
        <EmptyState
          icon={ConciergeBell}
          title="Aún no tienes servicios"
          description="Crea tu primer servicio con su duración y precio para empezar a recibir reservas."
          action={
            <Button onClick={openCreate}>
              <Plus /> Crear servicio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={(s) => setFormState({ open: true, service: s })}
              onToggleActive={toggleActive}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <ServiceFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((current) => ({ ...current, open }))}
        service={formState.service}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar "${deleting?.name}"?`}
        description="Esta acción no se puede deshacer. Si el servicio ya tiene citas, te recomendamos desactivarlo."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteService.mutateAsync(deleting.id);
            toast.success("Servicio eliminado");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}
