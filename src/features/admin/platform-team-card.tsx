import { Crown, KeyRound, Power, ShieldAlert, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { useAddPlatformAdmin, usePlatformAdmins, useSetUserActive } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { formatDateTime, getFullName } from "@/lib/format";
import { platformAdminSchema, type PlatformAdminInput } from "@/lib/validations/admin";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { PlatformAdmin } from "@/types";
import { useSetPasswordDialog } from "./use-set-password-dialog";

/**
 * Equipo de la plataforma: los super admins que ayudan con el soporte. Pueden hacer todo en el
 * panel de plataforma salvo gestionar a otros super admins: eso sólo lo hace el principal.
 */
export function PlatformTeamCard() {
  const { session } = useSession();
  const isOwner = Boolean(session?.platformOwner);
  const team = usePlatformAdmins();
  const setActive = useSetUserActive();
  const passwordDialog = useSetPasswordDialog();
  const [adding, setAdding] = useState(false);
  const [disabling, setDisabling] = useState<PlatformAdmin | null>(null);

  const toggle = async (admin: PlatformAdmin, active: boolean) => {
    try {
      await setActive.mutateAsync({ userId: admin.user.id, isActive: active });
      toast.success(active ? `${admin.user.firstName} vuelve a tener acceso` : `${admin.user.firstName} ya no tiene acceso`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="size-4 text-primary" aria-hidden /> Equipo de la plataforma
        </CardTitle>
        <CardDescription>
          Super admins que te ayudan con el soporte: entran a este panel y gestionan negocios como tú. Todo lo que hacen queda
          en la actividad con su nombre.
        </CardDescription>
        {isOwner && (
          <CardAction>
            <Button size="sm" onClick={() => setAdding(true)}>
              <UserPlus /> Agregar
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {team.isPending ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : team.isError ? (
          <ErrorState onRetry={() => team.refetch()} />
        ) : (
          <ul className="divide-y rounded-lg border" data-testid="platform-team">
            {team.data.map((admin) => {
              const { user } = admin;
              const name = getFullName(user);
              const manageable = isOwner && !user.platformOwner;
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar name={name} src={user.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {name}
                      {user.platformOwner && (
                        <Badge variant="secondary">
                          <Crown aria-hidden /> Principal
                        </Badge>
                      )}
                      {user.id === session?.userId && <Badge variant="outline">Tú</Badge>}
                      {!user.isActive && <Badge variant="destructive">Sin acceso</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {admin.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ShieldCheck className="size-3.5" aria-hidden /> Verificación en dos pasos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <ShieldAlert className="size-3.5" aria-hidden /> Sin verificación en dos pasos
                        </span>
                      )}
                      <span>{admin.lastSignInAt ? `Último acceso: ${formatDateTime(admin.lastSignInAt)}` : "Aún no ha entrado"}</span>
                    </p>
                  </div>
                  {manageable && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => passwordDialog.request({ id: user.id, name, email: user.email })}
                      >
                        <KeyRound /> Contraseña
                      </Button>
                      {user.isActive ? (
                        <Button size="sm" variant="outline" onClick={() => setDisabling(admin)}>
                          <Power /> Quitar acceso
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={setActive.isPending} onClick={() => toggle(admin, true)}>
                          <Power /> Devolver acceso
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!isOwner && (
          <p className="text-xs text-muted-foreground">Sólo el super admin principal agrega o quita super admins.</p>
        )}
      </CardContent>

      <AddPlatformAdminDialog open={adding} onOpenChange={setAdding} />
      {passwordDialog.dialog}
      <ConfirmDialog
        open={disabling !== null}
        onOpenChange={(open) => !open && setDisabling(null)}
        title={`¿Quitar el acceso a ${disabling ? getFullName(disabling.user) : ""}?`}
        description="Se cierran sus sesiones y ya no podrá entrar. Lo que hizo se conserva en la actividad. Puedes devolverle el acceso cuando quieras."
        confirmLabel="Quitar acceso"
        destructive
        onConfirm={async () => {
          if (disabling) await toggle(disabling, false);
          setDisabling(null);
        }}
      />
    </Card>
  );
}

const EMPTY: PlatformAdminInput = { firstName: "", lastName: "", email: "", password: "" };

function AddPlatformAdminDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Se monta de nuevo en cada apertura: el formulario empieza vacío. */}
        {open && <AddPlatformAdminForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AddPlatformAdminForm({ onDone }: { onDone: () => void }) {
  const add = useAddPlatformAdmin();
  const [values, setValues] = useState<PlatformAdminInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof PlatformAdminInput>(key: K, value: PlatformAdminInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(platformAdminSchema, values);
    setErrors(validation.errors);
    if (!validation.success) return;
    try {
      const admin = await add.mutateAsync(validation.data);
      toast.success(`${admin.user.firstName} ya es super admin. Le enviamos sus datos de acceso a ${admin.user.email}`);
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" aria-hidden /> Agregar un super admin
        </DialogTitle>
        <DialogDescription>
          Podrá entrar al panel de plataforma y gestionar negocios en modo soporte. Le enviaremos un email con su email de
          acceso y la contraseña que escribas.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" error={errors.firstName}>
          {(field) => <Input {...field} autoFocus value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />}
        </FormField>
        <FormField label="Apellido" error={errors.lastName}>
          {(field) => <Input {...field} value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />}
        </FormField>
      </div>
      <FormField label="Email" error={errors.email} hint="Una cuenta aparte: no puede ser el email de un negocio.">
        {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />}
      </FormField>
      <FormField label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres. Pídele que active la verificación en dos pasos al entrar.">
        {(field) => (
          <Input
            {...field}
            autoComplete="off"
            className="font-mono"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={add.isPending} loadingText="Creando…">
          Agregar super admin
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
