import { ArrowDown, ArrowUp, Landmark, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BANK_ACCOUNT_TYPE_LABELS } from "@/lib/constants/business";
import { MAX_BANK_ACCOUNTS, type BankAccountInput } from "@/lib/validations/payment";
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

/** Clave de cada cuenta en la lista (no tienen id): al ordenarlas, cada formulario sigue con la suya. */
let lastKey = 0;
const newKey = () => `cuenta-${++lastKey}`;

interface BankAccountsFieldsProps {
  /** Cuentas de la agenda, la principal primero; vacía: no cobra por transferencia. */
  value: BankAccountInput[];
  onChange: (value: BankAccountInput[]) => void;
  /** Errores del formulario (las claves llevan el prefijo "bankAccounts.<n>.", p. ej. "bankAccounts.1.number"). */
  errors: FieldErrors;
  /** Titular propuesto en cada cuenta nueva (el nombre de la agenda). */
  defaultHolder: string;
}

/**
 * Datos bancarios de una agenda: hasta 3 cuentas. Al reservar, el paciente las ve todas junto con el
 * monto, transfiere a cualquiera y envía el comprobante (lo sube o lo manda por WhatsApp). La
 * primera es la principal: es la que ve primero.
 */
export function BankAccountsFields({ value, onChange, errors, defaultHolder }: BankAccountsFieldsProps) {
  const listId = useId();
  const [keys, setKeys] = useState(() => value.map(newKey));
  // Si la lista cambió desde fuera (p. ej. "Descartar"), las que falten toman una clave por su posición.
  const rowKeys = value.map((_, index) => keys[index] ?? `sin-clave-${index}`);
  const full = value.length >= MAX_BANK_ACCOUNTS;

  const emptyAccount = (): BankAccountInput => ({ bank: "", accountType: "savings", number: "", holder: defaultHolder, holderId: "" });
  const update = (accounts: BankAccountInput[], accountKeys: string[]) => {
    setKeys(accountKeys);
    onChange(accounts);
  };
  const add = () => {
    if (!full) update([...value, emptyAccount()], [...rowKeys, newKey()]);
  };
  const remove = (index: number) =>
    update(
      value.filter((_, i) => i !== index),
      rowKeys.filter((_, i) => i !== index),
    );
  /** Sube (-1) o baja (+1) una cuenta: la primera es la principal. */
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= value.length) return;
    const swap = <T,>(list: T[]) => list.map((item, i) => (i === index ? list[target] : i === target ? list[index] : item));
    update(swap(value), swap(rowKeys));
  };
  const setAccount = (index: number, account: BankAccountInput) =>
    onChange(value.map((current, i) => (i === index ? account : current)));

  return (
    <div className="grid gap-4 rounded-lg border p-3">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="flex items-center gap-2 text-sm font-medium">
            <Landmark className="size-4 text-muted-foreground" aria-hidden /> Cobro por transferencia
          </span>
          <span className="block text-xs text-muted-foreground">
            Al reservar, el paciente ve estos datos y el monto, transfiere a cualquiera de las cuentas y te envía el comprobante.
          </span>
        </span>
        <Switch
          checked={value.length > 0}
          onCheckedChange={(checked) => update(checked ? [emptyAccount()] : [], checked ? [newKey()] : [])}
        />
      </label>
      {value.length > 0 && (
        <>
          <ol className="grid gap-3">
            {value.map((account, index) => (
              <li key={rowKeys[index]} aria-label={`Cuenta ${index + 1}`} className="grid min-w-0 gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                    Cuenta {index + 1}
                    {index === 0 && <span className="text-xs font-normal text-muted-foreground">Principal</span>}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {value.length > 1 && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          aria-label={`Subir la cuenta ${index + 1}`}
                          title="Subir"
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === value.length - 1}
                          aria-label={`Bajar la cuenta ${index + 1}`}
                          title="Bajar"
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown aria-hidden />
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Quitar la cuenta ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden /> Quitar
                    </Button>
                  </div>
                </div>
                <AccountFields
                  account={account}
                  onChange={(next) => setAccount(index, next)}
                  error={(key) => errors[`bankAccounts.${index}.${key}`]}
                  banksListId={listId}
                />
              </li>
            ))}
          </ol>
          <datalist id={listId}>
            {COMMON_BANKS.map((bank) => (
              <option key={bank} value={bank} />
            ))}
          </datalist>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Button type="button" variant="outline" size="sm" disabled={full} onClick={add}>
              <Plus aria-hidden /> Agregar otra cuenta
            </Button>
            <span className="text-xs text-muted-foreground">
              {full ? `Ya tienes las ${MAX_BANK_ACCOUNTS} cuentas posibles.` : `Hasta ${MAX_BANK_ACCOUNTS} cuentas: el paciente las ve todas.`}
            </span>
          </div>
          {errors.bankAccounts && <p className="text-xs font-medium text-destructive">{errors.bankAccounts}</p>}
        </>
      )}
    </div>
  );
}

/** Banco, tipo, número, cédula/RUC y titular de una cuenta. */
function AccountFields({
  account,
  onChange,
  error,
  banksListId,
}: {
  account: BankAccountInput;
  onChange: (account: BankAccountInput) => void;
  error: (key: keyof BankAccountInput) => string | undefined;
  /** Lista de bancos frecuentes (un solo <datalist> para todas las cuentas). */
  banksListId: string;
}) {
  const set = <K extends keyof BankAccountInput>(key: K, next: BankAccountInput[K]) => onChange({ ...account, [key]: next });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Banco o cooperativa" error={error("bank")}>
        {(field) => (
          <Input
            {...field}
            list={banksListId}
            autoComplete="off"
            placeholder="Banco Pichincha"
            value={account.bank}
            onChange={(e) => set("bank", e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Tipo de cuenta" error={error("accountType")}>
        {(field) => (
          <Select value={account.accountType} onValueChange={(type) => set("accountType", type as BankAccountType)}>
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
            value={account.number}
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
            value={account.holderId}
            onChange={(e) => set("holderId", e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Titular de la cuenta" error={error("holder")} className="sm:col-span-2" hint="Tal como aparece en el banco.">
        {(field) => <Input {...field} value={account.holder} onChange={(e) => set("holder", e.target.value)} />}
      </FormField>
    </div>
  );
}
