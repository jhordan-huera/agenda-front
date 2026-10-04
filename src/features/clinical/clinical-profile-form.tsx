import { Lock } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/features/settings/settings-section";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useSaveClinicalProfile } from "@/hooks/queries/use-clinical";
import { getErrorMessage } from "@/lib/data";
import { formatDateTime, formatNumericDate } from "@/lib/format";
import { onlyDigits } from "@/lib/identity";
import { clinicalProfileSchema, type ClinicalProfileInput } from "@/lib/validations/clinical";
import { validate } from "@/lib/validations/validate";
import type { ClinicalProfile } from "@/types";
import { HISTORY_FIELDS, SEX_OPTIONS } from "./clinical-labels";

const EMPTY_PROFILE: ClinicalProfileInput = {
  documentId: "",
  birthDate: "",
  sex: "",
  bloodType: "",
  emergencyContact: "",
  allergies: "",
  conditions: "",
  medications: "",
  surgeries: "",
  familyHistory: "",
  consentSigned: false,
};

function toFormValues(profile: ClinicalProfile | null, clientDocumentId: string): ClinicalProfileInput {
  if (!profile) return { ...EMPTY_PROFILE, documentId: clientDocumentId };
  const { consentDate, ...fields } = profile;
  return {
    documentId: fields.documentId,
    birthDate: fields.birthDate,
    sex: fields.sex,
    bloodType: fields.bloodType,
    emergencyContact: fields.emergencyContact,
    allergies: fields.allergies,
    conditions: fields.conditions,
    medications: fields.medications,
    surgeries: fields.surgeries,
    familyHistory: fields.familyHistory,
    consentSigned: Boolean(consentDate),
  };
}

/** Antecedentes del paciente: datos personales de salud que no cambian en cada consulta. */
export function ClinicalProfileForm({
  clientId,
  clientDocumentId = "",
  profile,
}: {
  clientId: string;
  /** Cédula de la ficha del cliente: se propone si aún no hay antecedentes. */
  clientDocumentId?: string;
  profile: ClinicalProfile | null;
}) {
  const saveProfile = useSaveClinicalProfile(clientId);
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(toFormValues(profile, clientDocumentId));

  const submit = async () => {
    const result = validate(clinicalProfileSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      reset(toFormValues(await saveProfile.mutateAsync(result.data), clientDocumentId));
      toast.success("Antecedentes guardados");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Antecedentes"
      description={
        profile
          ? `Actualizado el ${formatDateTime(profile.updatedAt)} por ${profile.updatedByName}.`
          : "Aún no se registraron antecedentes."
      }
      dirty={dirty}
      saving={saveProfile.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Cédula" error={errors.documentId}>
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              maxLength={20}
              value={values.documentId}
              onChange={(e) => setField("documentId", onlyDigits(e.target.value))}
            />
          )}
        </FormField>
        <FormField label="Fecha de nacimiento" error={errors.birthDate}>
          {(field) => (
            <Input {...field} type="date" value={values.birthDate} onChange={(e) => setField("birthDate", e.target.value)} />
          )}
        </FormField>
        <FormField label="Sexo">
          {(field) => (
            <Select value={values.sex || "none"} onValueChange={(sex) => setField("sex", (sex === "none" ? "" : sex) as ClinicalProfileInput["sex"])}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {SEX_OPTIONS.map((option) => (
                  <SelectItem key={option.label} value={option.value || "none"}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Tipo de sangre" error={errors.bloodType}>
          {(field) => (
            <Input {...field} placeholder="Ej.: O+" value={values.bloodType} onChange={(e) => setField("bloodType", e.target.value)} />
          )}
        </FormField>
      </div>
      <FormField label="Contacto de emergencia" error={errors.emergencyContact}>
        {(field) => (
          <Input
            {...field}
            placeholder="Nombre, parentesco y teléfono"
            value={values.emergencyContact}
            onChange={(e) => setField("emergencyContact", e.target.value)}
          />
        )}
      </FormField>
      {HISTORY_FIELDS.map(({ key, label, placeholder }) => (
        <FormField key={key} label={label} error={errors[key]}>
          {(field) => (
            <Textarea {...field} rows={2} placeholder={placeholder} value={values[key]} onChange={(e) => setField(key, e.target.value)} />
          )}
        </FormField>
      ))}
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Consentimiento informado</p>
        {profile?.consentDate ? (
          <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            Firmado el {formatNumericDate(profile.consentDate)}. La fecha la registró el sistema y no se puede modificar.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="consent-signed"
                checked={values.consentSigned}
                onCheckedChange={(checked) => setField("consentSigned", checked === true)}
              />
              <Label htmlFor="consent-signed" className="font-normal">
                El paciente firmó el consentimiento para el tratamiento de sus datos de salud
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Al guardar se registra automáticamente la fecha de hoy. Después no se puede cambiar ni quitar.
            </p>
          </>
        )}
      </div>
    </SettingsSection>
  );
}
