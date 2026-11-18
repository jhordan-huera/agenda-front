import { CircleAlert, LogOut, QrCode, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FORM_ALERT } from "@/features/auth/auth-styles";
import { usePatientSession } from "@/hooks/queries/use-patient-account";
import { useMediaQuery } from "@/hooks/use-media-query";
import { data, getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import { patientPasswordSchema } from "@/lib/validations/loyalty";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { PatientAccount } from "@/types";

/**
 * El engranaje de «Mi tarjeta» (spec 052): cambiar la contraseña, pedir un QR nuevo (el anterior deja de servir), salir
 * y eliminar la cuenta. A la derecha en el computador y desde abajo en el celular.
 */
export function PatientSettingsSheet({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PatientAccount;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const { setAccount, updateAccount, run } = usePatientSession();
  const [confirm, setConfirm] = useState<"qr" | "delete" | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Eliminar la cuenta pide la contraseña (revisión de seguridad): con una sesión olvidada abierta, nadie la borra.
  const [deletePassword, setDeletePassword] = useState("");

  const newQr = async () => {
    try {
      updateAccount(await run(() => data.patient.newQr()));
      toast.success("Listo, ya tienes tu QR nuevo. El anterior dejó de servir.");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      if (!deletePassword) throw new Error("Escribe tu contraseña para eliminar la cuenta.");
      await run(() => data.patient.deleteAccount(deletePassword));
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
    onOpenChange(false);
    setAccount(null);
    toast.success("Eliminamos tu cuenta.");
  };

  const logout = async (everywhere = false) => {
    setLeaving(true);
    try {
      await (everywhere ? data.patient.logoutEverywhere() : data.patient.logout());
      onOpenChange(false);
      setAccount(null);
      toast.success(everywhere ? "Cerramos tu sesión en todos tus dispositivos." : "Saliste de tu cuenta.");
    } catch (error) {
      toast.error(getErrorMessage(error));
      setLeaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl")}
          // El foco va a la hoja y no al primer campo: en el celular, el teclado taparía todo al abrirla.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
        >
          <SheetHeader className="gap-1 border-b pr-12">
            <SheetTitle className="text-lg leading-snug font-semibold">Tu cuenta</SheetTitle>
            <SheetDescription className="break-words">
              {account.name} · {account.phone}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pb-8">
            <PasswordSection />

            <section aria-labelledby="patient-qr-title" className="space-y-2">
              <h3 id="patient-qr-title" className="font-semibold">
                Tu QR
              </h3>
              <p className="text-sm text-muted-foreground">
                Si lo perdiste o alguien le tomó una foto, pide uno nuevo: el anterior deja de servir.
              </p>
              <Button variant="outline" className="h-11" onClick={() => setConfirm("qr")}>
                <QrCode aria-hidden /> Pedir un QR nuevo
              </Button>
            </section>

            <section aria-labelledby="patient-exit-title" className="space-y-2 border-t pt-6">
              <h3 id="patient-exit-title" className="font-semibold">
                Salir
              </h3>
              <p className="text-sm text-muted-foreground">
                Para volver a entrar, usa tu teléfono y tu contraseña. Si entraste en un celular que ya no tienes, cierra la
                sesión en todos.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" disabled={leaving} onClick={() => logout()}>
                  <LogOut aria-hidden /> Salir de mi cuenta
                </Button>
                <Button variant="ghost" className="h-11" disabled={leaving} onClick={() => logout(true)}>
                  Cerrar sesión en todos los dispositivos
                </Button>
              </div>
            </section>

            <section aria-labelledby="patient-delete-title" className="space-y-2 border-t pt-6">
              <h3 id="patient-delete-title" className="font-semibold">
                Eliminar la cuenta
              </h3>
              <p className="text-sm text-muted-foreground">
                Se borran tu cuenta y tu QR. Tus consultorios conservan tu ficha y los sellos que ganaste.
              </p>
              <Button variant="destructive" className="h-11" onClick={() => setConfirm("delete")}>
                <Trash2 aria-hidden /> Eliminar la cuenta
              </Button>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirm === "qr"}
        onOpenChange={(next) => !next && setConfirm(null)}
        title="¿Pedir un QR nuevo?"
        description="Tu QR de ahora deja de servir: si lo tienes guardado en una foto o impreso, usa el nuevo en tu próxima cita."
        confirmLabel="Pedir un QR nuevo"
        onConfirm={newQr}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(next) => {
          if (!next) {
            setConfirm(null);
            setDeletePassword("");
          }
        }}
        title="¿Eliminar tu cuenta?"
        description={
          <>
            Se borran tu cuenta y tu QR, y ya no podrás ver tu tarjeta. Tus consultorios conservan tu ficha, tus sellos y tus
            premios como parte de sus registros. Si después creas otra cuenta, tu consultorio tendrá que escanear tu QR nuevo.
            <span className="mt-3 block text-left">
              <FormField label="Tu contraseña">
                {(field) => (
                  <PasswordInput
                    {...field}
                    className="h-11"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                  />
                )}
              </FormField>
            </span>
          </>
        }
        confirmLabel="Eliminar la cuenta"
        destructive
        onConfirm={deleteAccount}
      />
    </>
  );
}

/**
 * Cambiar la contraseña: la actual y la nueva. Las demás sesiones de la cuenta se cierran (lo hace la API). Si la sesión
 * ya venció, `run` vuelve a «Entrar» (y esta hoja se cierra con la página).
 */
function PasswordSection() {
  const { run } = usePatientSession();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(patientPasswordSchema, values);
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;
    setPending(true);
    try {
      await run(() => data.patient.changePassword(result.data));
      setValues({ currentPassword: "", newPassword: "" });
      toast.success("Listo, tu contraseña nueva ya está guardada. Cerramos tu cuenta en los demás aparatos.");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="patient-password-title" className="space-y-3">
      <h3 id="patient-password-title" className="font-semibold">
        Cambiar la contraseña
      </h3>
      <form onSubmit={submit} noValidate className="grid gap-4">
        {formError && (
          <p role="alert" className={FORM_ALERT}>
            <CircleAlert aria-hidden />
            {formError}
          </p>
        )}
        <FormField label="Tu contraseña actual" error={errors.currentPassword}>
          {(field) => (
            <PasswordInput
              {...field}
              className="h-11"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={(event) => setValues({ ...values, currentPassword: event.target.value })}
            />
          )}
        </FormField>
        <FormField label="La contraseña nueva" error={errors.newPassword} hint="Mínimo 4 caracteres: puede ser un PIN de 4 números.">
          {(field) => (
            <PasswordInput
              {...field}
              className="h-11"
              autoComplete="new-password"
              value={values.newPassword}
              onChange={(event) => setValues({ ...values, newPassword: event.target.value })}
            />
          )}
        </FormField>
        <SubmitButton variant="outline" className="h-11 justify-self-start" loading={pending} loadingText="Guardando…">
          Guardar la contraseña
        </SubmitButton>
      </form>
    </section>
  );
}
