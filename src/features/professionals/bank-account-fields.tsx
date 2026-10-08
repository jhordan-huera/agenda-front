import { Landmark } from "lucide-react";
import { useId } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BANK_ACCOUNT_TYPE_LABELS } from "@/lib/constants/business";
import type { BankAccountInput } from "@/lib/validations/payment";
import type { FieldErrors } from "@/lib/validations/validate";
import type { BankAccountType } from "@/types";

/** Bancos y cooperativas frecuentes, para autocompletar (se puede escribir cualquiera). */
const COMMON_BANKS = [
  "Banco Pichincha",
  "Banco Guayaquil",
  "Produbanco",
  "Banco del Pacífico",
  "Banco Internacional",
  "Banco Bolivariano",
  "Banco del Austro",
  "Banco de Loja",
  "Banco General Rumiñahui",
  "Banco Solidario",
  "Cooperativa JEP",
  "Cooperativa Jardín Azuayo",
  "Cooperativa Atuntaqui",
  "Cooperativa Policía Nacional",
  "Cooperativa 29 de Octubre",
];

interface BankAccountFieldsProps {
  value: BankAccountInput | null;
  onChange: (value: BankAccountInput | null) => void;
  /** Errores del formulario (las claves llevan el prefijo "bankAccount."). */
  errors: FieldErrors;
  /** Titular propuesto al activarlo (el nombre de la agenda). */
  defaultHolder: string;
}

/**
 * Datos bancarios de una agenda: al reservar, el paciente los ve junto con el monto y envía el
 * comprobante (lo sube o lo manda por WhatsApp).
 */
export function BankAccountFields({ value, onChange, errors, defaultHolder }: BankAccountFieldsProps) {
  const listId = useId();
  const set = <K extends keyof BankAccountInput>(key: K, next: BankAccountInput[K]) => value && onChange({ ...value, [key]: next });
  const error = (key: keyof BankAccountInput) => errors[`bankAccount.${key}`];

  return (
    <div className="grid gap-4 rounded-lg border p-3">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="flex items-center gap-2 text-sm font-medium">
            <Landmark className="size-4 text-muted-foreground" aria-hidden /> Cobro por transferencia
          </span>
          <span className="block text-xs text-muted-foreground">
            Al reservar, el paciente ve estos datos y el monto, y te envía el comprobante.
          </span>
        </span>
        <Switch
          checked={value !== null}
          onCheckedChange={(checked) =>
            onChange(checked ? { bank: "", accountType: "savings", number: "", holder: defaultHolder, holderId: "" } : null)
          }
        />
      </label>
      {value && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Banco o cooperativa" error={error("bank")}>
            {(field) => (
              <>
                <Input
                  {...field}
                  list={listId}
                  autoComplete="off"
                  placeholder="Banco Pichincha"
                  value={value.bank}
                  onChange={(e) => set("bank", e.target.value)}
                />
                <datalist id={listId}>
                  {COMMON_BANKS.map((bank) => (
                    <option key={bank} value={bank} />
                  ))}
                </datalist>
              </>
            )}
          </FormField>
          <FormField label="Tipo de cuenta" error={error("accountType")}>
            {(field) => (
              <Select value={value.accountType} onValueChange={(type) => set("accountType", type as BankAccountType)}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {Object.entries(BANK_ACCOUNT_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Número de cuenta" error={error("number")}>
            {(field) => (
              <Input
                {...field}
                inputMode="numeric"
                autoComplete="off"
                className="font-mono"
                placeholder="2200123456"
                value={value.number}
                onChange={(e) => set("number", e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Cédula o RUC del titular" optional error={error("holderId")}>
            {(field) => (
              <Input
                {...field}
                inputMode="numeric"
                autoComplete="off"
                className="font-mono"
                value={value.holderId}
                onChange={(e) => set("holderId", e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Titular de la cuenta" error={error("holder")} className="sm:col-span-2" hint="Tal como aparece en el banco.">
            {(field) => <Input {...field} value={value.holder} onChange={(e) => set("holder", e.target.value)} />}
          </FormField>
        </div>
      )}
    </div>
  );
}
