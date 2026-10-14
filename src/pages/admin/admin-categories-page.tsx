import { Plus, Stethoscope, Tags, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryCard } from "@/features/admin/category-card";
import { CategoryFormDialog } from "@/features/admin/category-form-dialog";
import { StatGrid } from "@/features/admin/stat-cards";
import { useAdminCategories, useDeleteCategory } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import type { AdminBusinessCategory } from "@/types";

/** Categorías de negocio (base de datos): las que eligen los negocios al registrarse. */
export default function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const deleteCategory = useDeleteCategory();
  const [editing, setEditing] = useState<{ open: boolean; category: AdminBusinessCategory | null }>({
    open: false,
    category: null,
  });
  const [deleting, setDeleting] = useState<AdminBusinessCategory | null>(null);

  return (
    <div className="space-y-6">
      <PageTitle title="Categorías" />
      <PageHeader
        title="Categorías"
        description="Tipos de negocio que se eligen al registrarse. Cada una sugiere un primer servicio y puede activar la historia clínica."
        actions={
          <Button size="lg" onClick={() => setEditing({ open: true, category: null })}>
            <Plus /> Nueva categoría
          </Button>
        }
      />

      <StatGrid
        loading={categories.isPending}
        count={3}
        items={(() => {
          const list = categories.data ?? [];
          const active = list.filter((category) => category.isActive).length;
          return [
            { label: "Activas", value: active, icon: Tags, hint: `de ${list.length} en total` },
            { label: "Con historia clínica", value: list.filter((category) => category.isHealth).length, icon: Stethoscope },
            { label: "En uso", value: list.filter((category) => category.businessCount > 0).length, icon: Store, hint: "Con al menos un negocio" },
          ];
        })()}
      />

      {categories.isError ? (
        <ErrorState onRetry={() => categories.refetch()} />
      ) : categories.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.data.map((category) => (
            <li key={category.id}>
              <CategoryCard
                category={category}
                onEdit={() => setEditing({ open: true, category })}
                onDelete={() => setDeleting(category)}
              />
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={editing.open}
        category={editing.category}
        onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar la categoría ${deleting?.name ?? ""}?`}
        description="Ningún negocio la usa. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteCategory.mutateAsync(deleting.id);
            toast.success("Categoría eliminada");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}
