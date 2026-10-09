import { Check } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/features/settings/image-upload-field";
import { useProfessionals, useSaveProfessional } from "@/hooks/queries/use-professionals";
import { useServices } from "@/hooks/queries/use-services";
import { useTeam } from "@/hooks/queries/use-team";
import { useErrorToast } from "@/hooks/use-error-toast";
import { getInitials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { BankAccountFields } from "./bank-account-fields";
import { PROFESSIONAL_COLORS } from "./colors";
import { professionalSchema, type ProfessionalInput } from "@/lib/validations/professional";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Professional } from "@/types";


const NO_MEMBER = "none";

interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional?: Professional;
}

export function ProfessionalFormDialog({ open, onOpenChange, professional }: ProfessionalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{professional ? `Editar a ${professional.displayName}` : "Nuevo profesional"}</DialogTitle>
          <DialogDescription>
            Cada profesional tiene su agenda: su horario, sus bloqueos y los servicios que atiende.
          </DialogDescription>
        </DialogHeader>
        <ProfessionalForm key={professional?.id ?? "new"} professional={professional} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProfessionalForm({ professional, onDone }: { professional?: Professional; onDone: () => void }) {
  const { data: team = [] } = useTeam();
  const { data: services = [] } = useServices();
  const { data: professionals = [] } = useProfessionals();
  const save = useSaveProfessional();
  const showError = useErrorToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  // Subiendo la foto: "Guardar" espera (si no, se guardaba sin ella y la foto se perdía).
  const [uploading, setUploading] = useState(false);
  const usedColors = new Set(professionals.map((p) => p.color));
  const [values, setValues] = useState<ProfessionalInput>(() => ({
    displayName: professional?.displayName ?? "",
    title: professional?.title ?? "",
    avatarUrl: professional?.avatarUrl ?? null,
    color: professional?.color ?? PROFESSIONAL_COLORS.find((color) => !usedColors.has(color)) ?? PROFESSIONAL_COLORS[0],
    email: professional?.email ?? "",
    meetingUrl: professional?.meetingUrl ?? "",
    bankAccount: professional?.bankAccount ?? null,
    userId: professional?.userId ?? null,
    allServices: professional?.allServices ?? true,
    serviceIds: professional?.serviceIds ?? [],
    notifyNewAppointments: professional?.notifyNewAppointments ?? true,
    dailyAgenda: professional?.dailyAgenda ?? true,
    isActive: professional?.isActive ?? true,
  }));
  const set = <K extends keyof ProfessionalInput>(key: K, value: ProfessionalInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Miembros del equipo que aún no tienen agenda (y el elegido aquí: al guardar un profesional nuevo,
  // la lista recargada ya lo trae con ese usuario y el selector se quedaba en blanco).
  const takenUserIds = new Set(professionals.filter((p) => p.id !== professional?.id && p.userId).map((p) => p.userId));
  const members = team.filter((member) => !takenUserIds.has(member.userId) || member.userId === values.userId);
  const activeServices = services.filter((service) => service.isActive || values.serviceIds.includes(service.id));

  const chooseMember = (userId: string) => {
    const member = team.find((m) => m.userId === userId);
    setValues((current) => ({
      ...current,
      userId: member?.userId ?? null,
      // Al vincular a alguien: su nombre y su email, si aún no se escribieron.
      displayName: current.displayName || (member ? `${member.firstName} ${member.lastName}` : ""),
      email: current.email || member?.email || "",
    }));
  };

  const toggleService = (serviceId: string, checked: boolean) =>
    set("serviceIds", checked ? [...values.serviceIds, serviceId] : values.serviceIds.filter((id) => id !== serviceId));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (uploading || save.isPending) return;
    const result = validate(professionalSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await save.mutateAsync({ id: professional?.id, input: result.data });
      toast.success(professional ? "Profesional actualizado" : "Profesional agregado", {
        description: professional ? undefined : "Le copiamos el horario del negocio: ajústalo en Horarios.",
      });
      onDone();
    } catch (error) {
      showError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <ImageUploadField
        target="professional"
        label="Foto"
        value={values.avatarUrl}
        onChange={(avatarUrl) => set("avatarUrl", avatarUrl)}
        onUploadingChange={setUploading}
        fallback={getInitials(values.displayName || "?")}
        error={errors.avatarUrl}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre que ven los pacientes" error={errors.displayName}>
          {(field) => (
            <Input {...field} placeholder="Dra. Valeria Cruz" value={values.displayName} onChange={(e) => set("displayName", e.target.value)} />
          )}
        </FormField>
        <FormField label="Especialidad" error={errors.title} optional>
          {(field) => (
            <Input {...field} placeholder="Ortodoncista" value={values.title} onChange={(e) => set("title", e.target.value)} />
          )}
        </FormField>
      </div>

      <FormField label="Color en la agenda" error={errors.color}>
        {(field) => (
          <div id={field.id} role="radiogroup" aria-label="Color en la agenda" className="flex flex-wrap gap-2">
            {PROFESSIONAL_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={values.color === color}
                aria-label={`Color ${color}`}
                onClick={() => set("color", color)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-white ring-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  values.color === color && "ring-2 ring-ink",
                )}
                style={{ backgroundColor: color }}
              >
                {values.color === color && <Check className="size-4" aria-hidden />}
              </button>
            ))}
          </div>
        )}
      </FormField>

      <FormField
        label="Usuario del equipo"
        error={errors.userId}
        hint="Con usuario, entra al sistema y ve su agenda. El rol se elige en Configuración → Equipo."
      >
        {(field) => (
          <Select value={values.userId ?? NO_MEMBER} onValueChange={(value) => chooseMember(value === NO_MEMBER ? "" : value)}>
            <SelectTrigger {...field} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={NO_MEMBER}>Sin usuario (no entra al sistema)</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.firstName} {member.lastName} · {ROLE_LABELS[member.role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Servicios que atiende</legend>
        <div className="flex flex-wrap gap-2">
          <ChoiceButton selected={values.allServices} onClick={() => set("allServices", true)}>
            Todos los servicios
          </ChoiceButton>
          <ChoiceButton selected={!values.allServices} onClick={() => set("allServices", false)}>
            Sólo algunos
          </ChoiceButton>
        </div>
        {!values.allServices && (
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            {activeServices.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.serviceIds.includes(service.id)}
                  onCheckedChange={(checked) => toggleService(service.id, checked === true)}
                />
                {service.name}
              </label>
            ))}
          </div>
        )}
        {errors.serviceIds && <p className="text-xs font-medium text-destructive">{errors.serviceIds}</p>}
      </fieldset>

      <FormField label="Email para sus avisos" error={errors.email} optional hint="Vacío: no se le envían emails.">
        {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />}
      </FormField>
      <FormField
        label="Enlace de videollamada"
        error={errors.meetingUrl}
        optional
        hint="Su sala fija de Google Meet, Zoom o Teams. Se envía al paciente en las citas virtuales."
      >
        {(field) => (
          <Input
            {...field}
            type="url"
            inputMode="url"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={values.meetingUrl}
            onChange={(e) => set("meetingUrl", e.target.value)}
          />
        )}
      </FormField>
      <BankAccountFields
        value={values.bankAccount}
        onChange={(bankAccount) => set("bankAccount", bankAccount)}
        errors={errors}
        defaultHolder={values.displayName}
      />
      <div className="grid gap-2">
        <SwitchRow
          title="Avisarle de cada cita nueva"
          description="Las que reservan los pacientes o agenda recepción (no las que crea él)."
          checked={values.notifyNewAppointments}
          onChange={(checked) => set("notifyNewAppointments", checked)}
          disabled={!values.email}
        />
        <SwitchRow
          title="Enviarle su agenda cada mañana"
          description="Un email con sus citas del día, los días que tiene citas."
          checked={values.dailyAgenda}
          onChange={(checked) => set("dailyAgenda", checked)}
          disabled={!values.email}
        />
        <SwitchRow
          title="Activo"
          description="Inactivo no recibe citas nuevas ni aparece en la página de reservas; su historial se conserva."
          checked={values.isActive}
          onChange={(checked) => set("isActive", checked)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={save.isPending || uploading} loadingText={uploading ? "Subiendo foto…" : undefined}>
          {professional ? "Guardar cambios" : "Agregar profesional"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={onClick}>
      {children}
    </Button>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-center justify-between gap-4 rounded-lg border p-3", disabled && "opacity-60")}>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked && !disabled} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}
