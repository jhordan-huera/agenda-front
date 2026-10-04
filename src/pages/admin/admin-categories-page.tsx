import { Pencil, Plus, Stethoscope, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryFormDialog } from "@/features/admin/category-form-dialog";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { useAdminCategories, useDeleteCategory } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
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

      {categories.isError ? (
        <ErrorState onRetry={() => categories.refetch()} />
      ) : categories.isPending ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Categoría</TableHead>
                <TableHead>Negocios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24 pr-4">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.data.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                return (
                  <TableRow key={category.id} className={cn(!category.isActive && "text-muted-foreground")}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium">
                            {category.name}
                            {category.isHealth && (
                              <Stethoscope className="size-3.5 text-primary" aria-label="Negocio de salud" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{category.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{plural(category.businessCount, "negocio", "negocios")}</TableCell>
                    <TableCell>
                      {category.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${category.name}`}
                          onClick={() => setEditing({ open: true, category })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${category.name}`}
                          disabled={category.businessCount > 0}
                          title={category.businessCount > 0 ? "En uso: desactívala en lugar de eliminarla" : undefined}
                          onClick={() => setDeleting(category)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
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
