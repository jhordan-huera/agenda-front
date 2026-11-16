import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDeleteLoyaltyBenefit, useLoyaltyBenefits, useSaveLoyaltyBenefit } from "@/hooks/queries/use-loyalty";
import { describeBenefit } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { LoyaltyBenefit } from "@/types";
import { BenefitFormDialog } from "./benefit-form-dialog";

const timesWonText = (times: number) => (times === 1 ? "Ya lo ganó 1 paciente" : `Ya lo ganaron ${times} pacientes`);

/**
 * «Beneficios» de Fidelización (spec 052): de menos a más citas, con lo que se gana, si vence y si está activo.
 * Desactivar deja de desbloquearlo (lo ganado sigue); «Eliminar» lo borra si nadie lo ganó, o lo archiva.
 */
export function LoyaltyBenefits({ currency }: { currency?: string }) {
  const query = useLoyaltyBenefits();
  const save = useSaveLoyaltyBenefit();
  const remove = useDeleteLoyaltyBenefit();
  const [form, setForm] = useState<{ open: boolean; benefit?: LoyaltyBenefit }>({ open: false });
  const [deleting, setDeleting] = useState<LoyaltyBenefit | null>(null);
  const benefits = [...(query.data ?? [])].sort((a, b) => a.visitsRequired - b.visitsRequired);

  const toggleActive = async (benefit: LoyaltyBenefit) => {
    const { name, description, visitsRequired, kind, value, serviceId, conditions, validDays } = benefit;
    try {
      await save.mutateAsync({
        id: benefit.id,
        input: { name, description, visitsRequired, kind, value, serviceId, conditions, validDays, isActive: !benefit.isActive },
      });
      toast.success(benefit.isActive ? `Desactivamos «${name}»` : `Activamos «${name}»`, {
        description: benefit.isActive ? "Ya no se gana. Lo ya ganado sigue igual." : undefined,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addButton = (
    <Button onClick={() => setForm({ open: true })}>
      <Plus /> Agregar beneficio
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Cada beneficio se gana una vez por tarjeta, al llegar a sus citas atendidas.
        </p>
        {benefits.length > 0 && addButton}
      </div>

      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : benefits.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Todavía no tienes beneficios"
          description="Por ejemplo: 50 % de descuento en la limpieza a las 5 citas y un blanqueamiento gratis a las 10."
          action={addButton}
        />
      ) : (
        <ul className="space-y-3">
          {benefits.map((benefit) => (
            <li
              key={benefit.id}
              className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center", !benefit.isActive && "bg-muted/40")}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className={cn(
                    "flex size-12 shrink-0 flex-col items-center justify-center rounded-lg leading-none",
                    benefit.isActive ? "bg-accent text-ink" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <span className="text-lg font-bold tabular-nums">{benefit.visitsRequired}</span>
                  <span className="text-[0.6875rem]">{benefit.visitsRequired === 1 ? "cita" : "citas"}</span>
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {benefit.name}
                    <span className="sr-only">, a las {benefit.visitsRequired === 1 ? "1 cita" : `${benefit.visitsRequired} citas`}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {describeBenefit(benefit.kind, benefit.value, benefit.serviceName, currency)} ·{" "}
                    {benefit.validDays ? `vence a los ${benefit.validDays} días` : "no vence"}
                  </p>
                  {benefit.conditions && <p className="text-xs text-muted-foreground">{benefit.conditions}</p>}
                  {benefit.timesWon > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{timesWonText(benefit.timesWon)}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <label className="mr-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch
                    checked={benefit.isActive}
                    disabled={save.isPending && save.variables?.id === benefit.id}
                    onCheckedChange={() => void toggleActive(benefit)}
                    aria-label={`${benefit.isActive ? "Desactivar" : "Activar"} «${benefit.name}»`}
                    size="sm"
                  />
                  {benefit.isActive ? "Activo" : "Inactivo"}
                </label>
                <Button size="sm" variant="outline" onClick={() => setForm({ open: true, benefit })} aria-label={`Editar «${benefit.name}»`}>
                  <Pencil /> Editar
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(benefit)} aria-label={`Eliminar «${benefit.name}»`}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BenefitFormDialog
        open={form.open}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
        benefit={form.benefit}
        currency={currency}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar «${deleting?.name ?? "este beneficio"}»?`}
        description={
          deleting && deleting.timesWon > 0
            ? `${timesWonText(deleting.timesWon)}: se archiva. Sale de la tarjeta y de esta lista, y las recompensas ya ganadas siguen igual. Queda en la actividad.`
            : "Nadie lo ganó todavía: se borra. Si alguien ya lo hubiera ganado, se archivaría y sus recompensas seguirían igual. Queda en la actividad."
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            const { archived } = await remove.mutateAsync(deleting.id);
            toast.success(archived ? `Archivamos «${deleting.name}»` : `Eliminamos «${deleting.name}»`, {
              description: archived ? "Lo ya ganado sigue igual." : undefined,
            });
            setDeleting(null);
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </div>
  );
}
